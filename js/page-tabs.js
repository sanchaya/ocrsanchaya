(function() {
  var tabBarEl = null;

  function getEditor() {
    try { return window.tinymce && window.tinymce.get('0'); }
    catch(e) { return null; }
  }

  function buildTabBar(pageCount, activeIndex) {
    var bar = document.createElement('div');
    bar.className = 'page-tab-bar';

    var tabs = document.createElement('div');
    tabs.className = 'page-tabs-list';
    for (var i = 0; i < pageCount; i++) {
      var tab = document.createElement('button');
      tab.className = 'page-tab' + (i === activeIndex ? ' active' : '');
      tab.textContent = '' + (i + 1);
      tab.title = 'Page ' + (i + 1);
      (function(idx) {
        tab.addEventListener('click', function() {
          if (window.__switchEditorPage) {
            window.__switchEditorPage(idx);
          }
        });
      })(i);
      tabs.appendChild(tab);
    }
    bar.appendChild(tabs);

    var label = document.createElement('span');
    label.className = 'page-tab-label';
    label.textContent = 'Page ' + (activeIndex + 1) + ' of ' + pageCount;
    bar.appendChild(label);

    var actions = document.createElement('div');
    actions.className = 'page-tab-actions';
    var exportBtn = document.createElement('button');
    exportBtn.className = 'page-tab-export';
    exportBtn.textContent = 'Export All';
    exportBtn.addEventListener('click', function() {
      var pages = window.__pageTexts;
      if (!pages || pages.length === 0) { alert('No pages to export!'); return; }
      var text = pages.map(function(t, i) {
        return '\n--- Page ' + (i + 1) + ' ---\n\n' + t;
      }).join('');
      var blob = new Blob([text], { type: 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'ocr-result-all-pages.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    actions.appendChild(exportBtn);
    bar.appendChild(actions);

    return bar;
  }

  function updateTabBar() {
    var pages = window.__pageTexts;
    var current = window.__pageCurrent || 0;

    if (!pages || pages.length < 2) {
      if (tabBarEl && tabBarEl.parentNode) {
        tabBarEl.parentNode.removeChild(tabBarEl);
        tabBarEl = null;
      }
      return;
    }

    var newBar = buildTabBar(pages.length, current);
    var editorContainer = document.querySelector('.tox-tinymce');

    if (tabBarEl && tabBarEl.parentNode) {
      tabBarEl.parentNode.replaceChild(newBar, tabBarEl);
    } else if (editorContainer && editorContainer.parentNode) {
      editorContainer.parentNode.insertBefore(newBar, editorContainer);
    }
    tabBarEl = newBar;
  }

  window.addEventListener('pages-updated', function(e) {
    updateTabBar();
  });

  window.addEventListener('page-changed', function(e) {
    if (tabBarEl) {
      var pages = window.__pageTexts;
      var current = window.__pageCurrent || 0;
      if (pages && pages.length >= 2) {
        var newBar = buildTabBar(pages.length, current);
        if (tabBarEl && tabBarEl.parentNode) {
          tabBarEl.parentNode.replaceChild(newBar, tabBarEl);
        }
        tabBarEl = newBar;
      }
    }
  });

  function init() {
    var editor = getEditor();
    if (!editor) {
      setTimeout(init, 1000);
      return;
    }

    editor.on('input', function() {
      var pages = window.__pageTexts;
      var cur = window.__pageCurrent;
      if (pages && cur != null && pages[cur] !== undefined) {
        pages[cur] = editor.getContent({ format: 'text' });
      }
    });

    if (window.__pageTexts && window.__pageTexts.length >= 2) {
      updateTabBar();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 2000); });
  } else {
    setTimeout(init, 2000);
  }
})();
