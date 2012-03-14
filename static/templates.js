Handlebars.registerHelper('trackname', function() {
	var item = this;
	if(!item.metadata)
		return item.name;

	var s = '';
	if(item.metadata.title)
		s = item.metadata.title;
	if(item.metadata.artist) {
		if(s.length) {
			s = ' - ' + s;
			s = item.metadata.artist + s;
		}
	}
	if(!s.length)
		s = item.name;
	return s;
});

var templates = new (function Templates() {
	this.directory_item = Handlebars.compile('<li id="{{type}}-{{id}}" class="{{type}}{{#if nocache}} nocache{{/if}}"><a href="#">{{trackname}}</a>');
	this.playlist_item = Handlebars.compile('<td><a href="#" class="play">{{trackname}}</a></td><td><a href="#" class="delete"><img src="/static/icons/delete.png" alt="Delete" title="Delete" /></a></td>');
})();
