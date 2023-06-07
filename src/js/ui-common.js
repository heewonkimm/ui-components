'use strict';

/**
 * UI Functions
 * @returns {Object}
 */

const UI = ((window, document, $) => {
  return {
    /* init UI */
    init: () => {
      const html = document.documentElement;

      html.classList.add('init');

      /* dropdown */
      const dropdownBtn = document.querySelector('.dropdown .button');
      const dropdownToggle = document.querySelector('.dropdown .op-list');

      if(dropdownBtn && dropdownToggle) {
        dropdownBtn.addEventListener('click', (e) => {
          e.preventDefault();
          dropdownToggle.classList.toggle('on');
        });
      }
      
      /* accordion */
      const accordionBtn = document.querySelectorAll('.accordion .title');

      accordionBtn.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          btn.classList.toggle('on')
        });
      });

      /* tabs */
      const tabBtn = document.querySelectorAll('.tabs .tab-menu a');
      const tabCont = document.querySelectorAll('.tabs .tab-content .content');

      tabBtn.forEach((btn) =>  {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
    
          tabCont.forEach((content) => {
            content.style.display = 'none';
          });
    
          tabBtn.forEach((btn) => {
            btn.classList.remove('active');
          });
    
          const target = this.getAttribute('href');
          document.querySelector(target).style.display = 'block';
          this.classList.add('active');
        });
      });
      
    }
  };
})(window, document, jQuery);

window.addEventListener('DOMContentLoaded', () => {
  UI.init();
});