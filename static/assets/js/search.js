/* The same Lunr query and result layout used by So Simple's search page. */
(function () {
  // Zola's stripped HTML still contains entities; decode them for plain text results.
  var decoder = document.createElement('textarea');
  store.forEach(function (post) {
    decoder.innerHTML = post.excerpt;
    post.excerpt = decoder.value;
  });
  var idx = lunr(function () {
    this.field('title');
    this.field('excerpt');
    this.field('categories');
    this.field('tags');
    this.ref('id');
    this.pipeline.remove(lunr.trimmer);
    store.forEach(function (post, id) { this.add(Object.assign({ id: id }, post)); }, this);
  });
  document.getElementById('search').addEventListener('input', function () {
    var query = this.value.toLowerCase();
    var result = idx.query(function (q) {
      query.split(lunr.tokenizer.separator).forEach(function (term) {
        q.term(term, { boost: 100 });
        if (query.lastIndexOf(' ') !== query.length - 1) {
          q.term(term, { usePipeline: false, wildcard: lunr.Query.wildcard.TRAILING, boost: 10 });
        }
        if (term !== '') q.term(term, { usePipeline: false, editDistance: 1, boost: 1 });
      });
    });
    var results = document.getElementById('results');
    results.replaceChildren();
    var count = document.createElement('p');
    count.className = 'results__found';
    count.textContent = result.length + ' Result(s) found';
    results.appendChild(count);
    result.forEach(function (match) {
      var post = store[match.ref];
      var article = document.createElement('article');
      article.className = 'entry';
      var heading = document.createElement('h3');
      heading.className = 'entry-title';
      var link = document.createElement('a');
      link.href = post.url;
      link.textContent = post.title;
      heading.appendChild(link);
      var excerpt = document.createElement('div');
      excerpt.className = 'entry-excerpt';
      var paragraph = document.createElement('p');
      paragraph.textContent = post.excerpt.trim().split(/\s+/).slice(0, 20).join(' ') + '...';
      excerpt.appendChild(paragraph);
      article.append(heading, excerpt);
      results.appendChild(article);
    });
  });
})();
