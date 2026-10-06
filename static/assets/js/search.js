/* Display results from Zola's generated search index in the So Simple layout. */
(function () {
  var idx = elasticlunr.Index.load(window.searchIndex);
  document.getElementById('search').addEventListener('input', function () {
    var query = this.value.trim();
    var results = document.getElementById('results');
    results.replaceChildren();
    if (!query) return;
    var result = idx.search(query, { fields: { title: { boost: 2 }, body: { boost: 1 } }, bool: 'AND', expand: true });
    var count = document.createElement('p');
    count.className = 'results__found';
    count.textContent = result.length + ' Result(s) found';
    results.appendChild(count);
    result.forEach(function (match) {
      var post = idx.documentStore.getDoc(match.ref);
      var article = document.createElement('article');
      article.className = 'entry';
      var heading = document.createElement('h3');
      heading.className = 'entry-title';
      var link = document.createElement('a');
      link.href = match.ref;
      link.textContent = post.title;
      heading.appendChild(link);
      var excerpt = document.createElement('div');
      excerpt.className = 'entry-excerpt';
      var paragraph = document.createElement('p');
      paragraph.textContent = post.body.trim().split(/\s+/).slice(0, 20).join(' ') + '...';
      excerpt.appendChild(paragraph);
      article.append(heading, excerpt);
      results.appendChild(article);
    });
  });
})();
