###
 * Federated Wiki : Changes Plugin
 *
 * Licensed under the MIT license.
 * https://github.com/fedwiki/wiki-plugin-changes/blob/master/LICENSE.txt
###

escape = (line) ->
  line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

listItemHtml = (slug, title)->
  """
    <li>
      <a class="internal" href="#" title="local" data-page-name="#{slug}" data-site="local">
        #{escape title}
      </a>
      <button class="delete">✕</button>
    </li>
  """


constructor = ($, dependencies={})->
  localStorage = dependencies.localStorage || window.localStorage

  pageBundle = ->
    bundle = {}
    length = localStorage.length
    for i in [0...length]
      slug = localStorage.key i
      if slug.match /^[a-z-]+$/
        try
          page = JSON.parse localStorage.getItem slug
          if page.title?
            bundle[slug] = page
    bundle

  emit = ($div, item) ->
    bundle = pageBundle()
    bundled = Object.keys(bundle).length > 0
    if bundled
      $div.append( '<ul><p><i>no local changes</i></p></ul>' )
      return

    $div.append( ul = $('<ul />') )
    for slug of bundle
      ul.append listItemHtml(slug,bundle[slug].title)

    if bundled
      if item.submit?
        ul.append """<button class="submit">Submit Changes</button>"""
      else
        $div.append """
          <p> Click <i>Export Changes</i> to download changed pages as <i>#{location.hostname}.json</i>.
          Drag-and-drop this file to import pages elsewhere.</p>
          <ul><button class="export">Export Changes</button></ul>
        """

  bind = ($div, item) ->
    $div.on 'click', '.delete', ->
      slug = $(this).siblings('a.internal').data('pageName')
      localStorage.removeItem(slug)
      emit( $div.empty(), item )

    $div.on 'click', '.submit', ->
      $.ajax
        type: 'PUT'
        url: "/submit"
        data:
          'bundle': JSON.stringify(pageBundle())
        success: (citation, textStatus, jqXHR) ->
          wiki.log "ajax submit success", citation, textStatus, jqXHR
          throw new Exception "Incomplete Submission" unless citation.type and citation.site
          pageElement = $div.parents('.page:first')
          itemElement = $("<div />", class: "item #{citation.type}").data('item',citation).attr('data-id', citation.id)
          itemElement.data 'pageElement', pageElement
          pageElement.find(".story").append(itemElement)
          wiki.doPlugin itemElement, citation
          beforeElement = itemElement.prev('.item')
          before = wiki.getItem(beforeElement)
          wiki.pageHandler.put pageElement, {item: citation, id: citation.id, type: "add", after: before?.id}
        error: (xhr, type, msg) ->
          wiki.log "ajax error callback", type, msg

    $div.on 'click', '.export', ->
      anchor = document.createElement('a')
      document.body.appendChild(anchor)
      anchor.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pageBundle())))
      anchor.setAttribute('download', location.hostname + '.json')
      anchor.click()
      document.body.removeChild(anchor)

    $div.dblclick ->
      bundle = pageBundle()
      count = _.size(bundle)
      wiki.dialog "JSON bundle for #{count} pages",  $('<pre/>').text(JSON.stringify(bundle, null, 2))

  {
    emit: emit
    bind: bind
  }

wiki.registerPlugin( 'changes', constructor )

module.exports = constructor if module?
