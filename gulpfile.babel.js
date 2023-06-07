import { src, dest, watch, series, parallel } from 'gulp';
// import gulpIf from 'gulp-if';
import path from 'path';
import del from 'del';
import { create as browserSyncCreate } from 'browser-sync';
const browserSync = browserSyncCreate();
const browserSyncReload = browserSync.reload;

import nunjucksRender from 'gulp-nunjucks-render';
import indent from 'indent.js';
import through2 from 'through2';
import data from 'gulp-data';
import htmlhint from 'gulp-htmlhint';

import gulpSass from 'gulp-sass';
import dartSass from 'sass';
const sass = gulpSass(dartSass);
import sassGlob from 'gulp-sass-glob-use-forward';
import replace from 'gulp-replace';
import autoprefixer from 'gulp-autoprefixer';
import postcss from 'gulp-postcss';
import pxtorem from 'gulp-pxtorem';
import reporter from 'postcss-reporter';
import syntax_scss from 'postcss-scss';
// import mqpacker from 'gulp-css-mqpacker';
import stylelint from 'stylelint';

import babel from 'gulp-babel';

import spritesmith from 'gulp.spritesmith-multi';
import merge from 'merge-stream';

const env = process.env.NODE_ENV;
const isDevEnv = env === 'development';
const isProdEnv = env === 'production';
const baseDir = './dist';
const port = 3010;

const serve = callback => {
  const config = {
    open: true,
    https: false,
    logFileChanges: false,
    port: port,
    ui: { port: port + 1 },
    ghostMode: {
      clicks: false,
      forms: false,
      scroll: false
    },
    server: {
      baseDir: baseDir,
      directory: true,
    }
  };

  browserSync.init(config);
  callback();
};

const delHtml = filepath => {
  const isSingleFile = typeof filepath === 'string';
  const distPath = isSingleFile ? `./${filepath.replace('src', 'dist')}` : `${baseDir}/html`;

  return del(distPath);
};

const buildHtml = filepath => {
  const isSingleFile = typeof filepath === 'string';
  const isIncFile = isSingleFile && filepath.includes('@inc');
  const isPopupFile = isSingleFile && filepath.includes('popup');
  const isBuildOnlyOne = isSingleFile && !(isIncFile || isPopupFile);

  const srcPath = isBuildOnlyOne ? filepath : ['./src/html/**/*.html', '!./src/html/**/@inc/**/*.html'];
  const srcOpt = {
    base: './src',
    allowEmpty: true
  }
  const replacePath = file => {
    const relPath = path.relative('./src', file.path);
    const depth = relPath.split(path.sep).length - 1;
    const base = '../'.repeat(depth).slice(0,-1);

    return {
      path: relPath,
      base: base,
      htmlBase: `${base}/html`,
      cssBase: `${base}/css`,
      imgBase: `${base}/img`,
      jsBase: `${base}/js`,
      port: port,
    };
  }
  const nunjucksOpt = {
    path: './src/html',
    ext: '.html',
    envOptions: {
      autoescape: false,
      trimBlocks: true,
      lstripBlocks: true,
    }
  }
  const insertTabIndent = (file, enc, callback) => {
    // <!-- disableAutoIndent --> 주석이 있는 파일은 auto indent 제외
    if(file.contents.includes('<!-- disableAutoIndent -->')) return callback(null, file);

    const indentHTML = indent.html(String(file.contents), { tabString: '	' });

    file.contents = Buffer.from(indentHTML);

    return callback(null, file);
  }
  const reportTask = () => {
    if(isSingleFile) {
      if(isSingleFile && !(isIncFile || isPopupFile)) {
        console.log('\x1b[36m%s\x1b[0m', 'buildHtml', `Changed : ./${filepath.replace('\\', '/')}`);
      } else {
        console.log('\x1b[36m%s\x1b[0m', 'buildHtml', `Changed : ./src/html/**/*.html`);
      }
    }
  }

  return src(srcPath, srcOpt)
  .pipe(data(replacePath))
  .pipe(nunjucksRender(nunjucksOpt))
  .on('error', console.error)
  .pipe(through2({ objectMode: true }, insertTabIndent))
  .pipe(htmlhint('.htmlhintrc'))
  .pipe(htmlhint.reporter())
  .pipe(dest(baseDir))
  .pipe(browserSyncReload({ stream: true }))
  .on('end', reportTask);
};

const html = series(delHtml, buildHtml);

const delStyle = () => {
  const distPath = `${baseDir}/css`;

  return del(distPath);
};

const lintStyle = data => {
  const stylelintrc = require('./.stylelintrc.json');
  const isSingleFile = typeof data === 'object';
  const srcPath = isSingleFile
  ? data.srcPath
  : [
    './src/scss/**/*.scss',
    '!./src/scss/vendors/**/*.scss',
    '!./src/scss/base/_reset.scss'
  ];
  let errorLength = 0;

  const srcOpt = { allowEmpty: true };
  const reportOpt = {
    clearReportedMessages: true,
    clearMessages: true,
    throwError: false,
    filter: () => {
      errorLength += 1;

      return true;
    }
  };
  const fixScss = (file, enc, callback) => {
    const filePath = path.relative('./', file.path);

    if(isSingleFile && errorLength) {
      const watchScss = data.watchScss;

      watchScss.unwatch(filePath);
      setTimeout(() => watchScss.add(filePath), 1000);
      errorLength = 0;
    }

    stylelint.lint({
      files: filePath,
      fix: true,
      customSyntax: syntax_scss
    });

    return callback(null, file);
  }

  return src(srcPath, srcOpt)
  .pipe(postcss([
    stylelint(stylelintrc),
    reporter(reportOpt)
  ], { syntax: syntax_scss }))
  .pipe(through2({ objectMode: true }, fixScss));
};

const buildStyle = filepath => {
  const isSingleFile = typeof filepath === 'string';
  const srcPath = './src/scss/**/*.scss';
  const srcOpt = {
    allowEmpty: true,
    sourcemaps: true
  };

  const sassOpt = {
    indentType: 'tab',
    indentWidth: 1,
    errLogToConsole: true,
    outputStyle: isDevEnv ? 'expanded' : 'compressed'
  };
  const replacePath = function() {
    const relPath = path.relative('./src/scss', this.file.path);
    const paths = relPath.split(path.sep);
    const depth = paths.length;
    const base = '../'.repeat(depth).slice(0, -1);

    return `${base}/img${depth > 2 ? `/${paths[1]}` : ''}`;
  }
  const autoprefixerOpt = {
    cascade: true,
    remove: false
  };
  const pxtoremOpt = {
    rootValue: 10,
    propList: ['font', 'font-size'],
    selectorBlackList: [/^html$/]
  };
  const convertOneLineCSS = (file, encoding, callback) => {
    if (file.isNull() || isProdEnv) {
      return callback(null, file);
    }

    const css = file.contents.toString(encoding);
    const oneLineCSS = css
      .replace(/([;{])\s*/g, '$1 ')
      .replace(/}\s*/g, '}\n')
      .replace(/\s*(!important)/g, '$1')
      .replace(/(\/\*[^*]*\*+([^/*][^*]*\*+)*\/)\s*/g, '$1 ')
      .replace(/(@(?:media|keyframes|supports)[^{]*{)\s*([^{]*{[^}]*})\s*/gi, '$1\n$2 ')
      file.contents = Buffer.from(oneLineCSS, encoding);

    callback(null, file);
  }
  const reportTask = () => {
    if(isSingleFile) {
      console.log('\x1b[36m%s\x1b[0m', 'buildStyle', `Changed : ./${filepath.replace('\\', '/')}`);
    }
  }

  return src(srcPath, srcOpt)
  .pipe(sassGlob())
  .pipe(sass(sassOpt)
  .on('error', sass.logError))
  .pipe(replace('@@img', replacePath))
  .pipe(autoprefixer(autoprefixerOpt))
  // .pipe(pxtorem(pxtoremOpt))
  // .pipe(gulpIf(isDevEnv, mqpacker()))
  // .pipe(through2.obj(convertOneLineCSS))
  .pipe(dest(`${baseDir}/css`, { sourcemaps: './' }))
  .pipe(browserSyncReload({ stream: true }))
  .on('end', reportTask);
};

const style = series(delStyle, lintStyle, buildStyle);

const delSprite = () => {
  const distPath = `${baseDir}/sprites/**/*.png`;

  return del(distPath);
};

const createSprite = (filepath) => {
  const isSingleFile = typeof filepath === 'string';
  const srcPath = isSingleFile ? `${filepath.split(path.sep).slice(0, -1).join(path.sep)}/**/*.png` : `./src/sprites/**/*.png`;

  const spriteData = src(srcPath, { allowEmpty: true })
  .pipe(spritesmith({
    spritesmith: (options, sprite) => {
      options.imgPath = `@@img/sprites/${options.imgName}`;
      options.cssName = `_${sprite}-sprite.scss`;
      options.cssTemplate = null;
      options.cssSpritesheetName = sprite;
      options.padding = 10;
      options.cssVarMap = (sp) => {
        sp.name = `${sprite}-${sp.name}`;
      };
    }
  }));

  const imgStream = spriteData.img
  .pipe(dest(`${baseDir}/img/sprites`));

  const cssStream = spriteData.css
  .pipe(dest(`./src/scss/vendors`));

  return merge(imgStream, cssStream)
  .pipe(browserSync.reload({ stream: true }))
  .on('end', () => {
    if(isSingleFile) {
      console.log('\x1b[36m%s\x1b[0m', 'createSprite', `Changed : ./${filepath.replaceAll('\\', '/')}`);
    }
  });
};

const sprite = series(delSprite, createSprite);

const babelJs = filepath => {
  const isSingleFile = typeof filepath === 'string';
  const srcPath = './src/js/*.js';

  const reportTask = () => {
    if(isSingleFile) {
      console.log('\x1b[36m%s\x1b[0m', 'babelJs', `Changed : ./${filepath.replace('\\', '/')}`);
    }
  }

  return src(srcPath, { allowEmpty: true })
  .pipe(babel({ presets: ['@babel/env'] }))
  .pipe(dest(`${baseDir}/js`))
  .pipe(browserSyncReload({ stream: true }))
  .on('end', reportTask);
};

const watchFiles = () => {
  const copyTask = (task, parameter) => {
    const cloneTask = () => task(parameter);

    cloneTask.displayName = task.name;

    return cloneTask;
  };

  const watchHtml = (type, file) => {
    const srcPath = path.relative('./', file);
    const isIncHtml = file.includes('@inc');
    const isPopupHtml = file.includes('popup');

    if(type === 'delete' && (isIncHtml || isPopupHtml)) {
      series(delHtml, copyTask(buildHtml, srcPath))();
    } else {
      series(copyTask(type === 'change' ? buildHtml : delHtml, srcPath))();
    }
  };

  watch('./src/**/*.html')
    .on('add', file => watchHtml('change', file))
    .on('change', file => watchHtml('change', file))
    .on('unlink', file => watchHtml('delete', file));

  const watchStyle = file => {
    const srcPath = path.relative('./', file);
    const ignore = ['vendors'];
    const isIgnoreFile = file.split(path.sep).some(srcWord => ignore.includes(srcWord));

    if (isIgnoreFile) {
      series(copyTask(buildStyle, srcPath))();
    } else {
      series(
        copyTask(lintStyle, { srcPath: srcPath, watchScss: watch('./src/scss/**/*.scss') }),
        copyTask(buildStyle, srcPath)
      )();
    }
  };

  watch('./src/scss/**/*.scss')
    .on('add', watchStyle)
    .on('change', watchStyle)
    .on('unlink', watchStyle);

  const changeSprite = (file) => {
    const srcPath = path.relative('./', file);

    series(copyTask(createSprite, srcPath), buildStyle)();
  };

  watch('./src/sprites/**')
    .on('add', changeSprite)
    .on('change', changeSprite)
    .on('unlink', changeSprite);

  const watchJs = file => {
    const srcPath = path.relative('./', file);

    series(copyTask(babelJs, srcPath))();
  };
  

  watch('./src/js/*.js')
    .on('add', watchJs)
    .on('change', watchJs)
    .on('unlink', browserSyncReload);

  watch([
    `${baseDir}/js/**`,
    `!${baseDir}/js/*.js`
  ])
    .on('add', browserSyncReload)
    .on('change', browserSyncReload)
    .on('unlink', browserSyncReload);

  browserSyncReload();
};


const dev = series(parallel(html, series(sprite, style), babelJs), serve, watchFiles);

export const build = parallel(html, series(sprite, style), babelJs);
export const watchFile = parallel(serve, watchFiles);
export default dev;