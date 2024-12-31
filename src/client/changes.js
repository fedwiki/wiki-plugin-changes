/*
 * Federated Wiki : Changes Plugin
 *
 * Licensed under the MIT license.
 * https://github.com/fedwiki/wiki-plugin-changes/blob/master/LICENSE.txt
 */

const escape = line => {
  return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const listItemHtml = (slug, title) => {
  return `
    <li>
      <a class="internal" href="#" title="local" data-page-name="${slug}" data-site="local">${escape(title)}</a>
      <button class="delete">✕</button>
    </li>
  `
}

const pageBundle = () => {
  const bundle = {}
  for (let i = 0; i < localStorage.length; i++) {
    const slug = localStorage.key(i)
    bundle[slug] = JSON.parse(localStorage.getItem(slug))
  }
  return bundle
}

const constructor = ($, dependencies = {}) => {
  const localStorage = dependencies.localStorage || window.localStorage

  const emit = ($div, item) => {
    if (localStorage.length == 0) {
      $div.append('<ul><p><i>no local changes</i></p></ul>')
      return
    }

    const ul = $('<ul />')
    $div.append(ul)

    for (let i = 0; i < localStorage.length; i++) {
      const slug = localStorage.key(i)
      const page = JSON.parse(localStorage.getItem(slug))
      if (page.title) {
        ul.append(listItemHtml(slug, page.title))
      }
    }

    if (localStorage.length > 0) {
      if (item.submit) {
        ul.append(`<button class="submit">Submit Changes</button>`)
      } else {
        $div.append(`
          <p> Click <i>Export Changes</i> to download changed pages as <i>${location.hostname}.json</i>.
          Drag-and-drop this file to import pages elsewhere.</p>
          <ul><button class="export">Export Changes</button></ul>
        `)
      }
    }
  }

  const bind = ($div, item) => {
    $div.on('click', '.delete', function () {
      const slug = $(this).siblings('a.internal').data('pageName')
      localStorage.removeItem(slug)
      emit($div.empty(), item)
    })

    $div.on('click', '.submit', function () {
      $.ajax({
        type: 'PUT',
        url: '/submit',
        data: {
          bundle: JSON.stringify(pageBundle(localStorage)),
        },
        success: (citation, textStatus, jqXHR) => {
          wiki.log('ajax submit success', citation, textStatus, jqXHR)
          if (!citation.type || !citation.site) throw new Error('Incomplete Submission')

          const pageElement = $div.parents('.page:first')
          const itemElement = $('<div />', {
            class: `item ${citation.type}`,
          })
            .data('item', citation)
            .attr('data-id', citation.id)

          itemElement.data('pageElement', pageElement)
          pageElement.find('.story').append(itemElement)
          wiki.doPlugin(itemElement, citation)

          const beforeElement = itemElement.prev('.item')
          const before = wiki.getItem(beforeElement)
          wiki.pageHandler.put(pageElement, {
            item: citation,
            id: citation.id,
            type: 'add',
            after: before?.id,
          })
        },
        error: (xhr, type, msg) => {
          wiki.log('ajax error callback', type, msg)
        },
      })
    })

    $div.on('click', '.export', function () {
      const anchor = document.createElement('a')
      document.body.appendChild(anchor)
      anchor.setAttribute(
        'href',
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pageBundle(localStorage))),
      )
      anchor.setAttribute('download', location.hostname + '.json')
      anchor.click()
      document.body.removeChild(anchor)
    })

    $div.on('dblclick', function () {
      const bundle = pageBundle(localStorage)
      const count = Object.keys(bundle).length
      wiki.dialog('JSON bundle for ' + count + ' pages', $('<pre/>').text(JSON.stringify(bundle, null, 2)))
    })
  }

  return {
    emit,
    bind,
  }
}

wiki.registerPlugin('changes', constructor)

export default constructor
