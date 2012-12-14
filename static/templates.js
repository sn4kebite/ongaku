Handlebars.registerHelper('trackname', function() {
	var item = this;
	if(!item.metadata)
		return item.name;

	if(item.metadata.title)
		return item.metadata.title;
	else
		return item.name;
});

var templates = new (function Templates() {
	this.directory_item = Handlebars.compile('<tr id="{{type}}-{{id}}"><td><a href="#" class="{{type}}{{#unless cache}} nocache{{/unless}}">{{trackname}}</a></td><td>{{metadata.artist}}</td><td>{{metadata.album}}</td></tr>');
	// The playlist automatically adds a tr tag.
	this.playlist_item = Handlebars.compile('<td><a href="#" class="play">{{trackname}}</a></td><td><a href="#">{{metadata.artist}}</a></td><td><a href="#">{{metadata.album}}</a></td><td class="track-buttons"><a href="#" class="delete"><img src="/static/icons/delete.png" alt="Delete" title="Delete" /></a></td>');
})();
