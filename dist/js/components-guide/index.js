$(function() {
  $('.component-item').each(function(i) {
    var $item = $(this);
    var code = $item.find('.component-contents').html();
    var indentReplacedCode = code.split(/[\r]?\n/gi).reduce(function(p, c, i) {
    if(i === 1) p.replaceIndent = Array.prototype.filter.call(c, function(c) { return c === '\t'; }).join('');
    return p.codeLines.push(c.replace(p.replaceIndent, '')), p;
    }, { codeLines: [], replaceIndent: '' }).codeLines.join('\r\n');
    var parsedCode = indentReplacedCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    // var hasGrid = $item.parent().hasClass('component-row');

	$item.css('width', `${(100 / $item.parent().find('.component-contents').length).toFixed(2)}%`)
    if($item.data('title')) $item.prepend(`<div class="component-title">${$item.data('title')}</div>`);
    $item.append('<button type="button" class="btn-expand"><span>Expand</span></button>');
    $item.append(`<pre class="code"><code class="html">${parsedCode}</code></pre>`);
  });

  hljs.configure({tabReplace: '<span class="code-indent">\t</span>'});

  $('pre.code > code').each(function(i, block) {
    hljs.highlightBlock(block);
  });

  $('.btn-expand').on('click', function() {
    var $this = $(this);

    if($this.hasClass('on')) {
      $this.removeClass('on');
      $this.find('span').text('Expand');
      $this.next().slideUp(100);
    } else {
      $this.addClass('on');
      $this.find('span').text('Hide');
      $this.next().slideDown(100);
    }
  });

  (function() {
    var $window = $(window);
    var $section = $('.component-head');
    var len = $section.length;
    var $resizePadding = $('.resize-padding');

    $('.component-head').each(function() {
      $('.component-nav .list').append('<li><a href="#">' + $(this).text() + '</a></li>');
    });

    $('.component-nav .list').on('click', 'a', function(e) {
      var $this = $(this);
      var index = $this.closest('li').index();
      $('html,body').animate({scrollTop: $('.component-head').eq(index).offset().top - 15 }, 200);
      e.preventDefault();
    });

    function setPosition() {
      var scrTop = $window.scrollTop();
      var winHeight = $window.height();
      var topMargin = 25;
      var current = 0;
      var sectionOffset = $.map($section, function(o) { return $(o).offset().top - topMargin; });
      var endPoint = sectionOffset[len - 1];
      var bottomPadding = winHeight - ($resizePadding.offset().top - endPoint);

      // 현재 보는 영역
      for(var i in sectionOffset) {
        if(scrTop + topMargin >= sectionOffset[i]) {
          current = i;
        }
        else break;
      }

      $('.component-nav li').eq(current).addClass('on').siblings().removeClass('on');

      // 하단 패딩 리사이즈
      $resizePadding.css('height', bottomPadding > 100 ? bottomPadding : 100 );
    }

    setPosition();
    $window.on('load scroll resize', setPosition);
  })();
});