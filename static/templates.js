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
	this.track_item = Handlebars.compile('<tr id="{{type}}-{{id}}"><td><a href="#" class="{{type}}{{#unless cache}} nocache{{/unless}}">{{trackname}}</a></td><td>{{metadata.artist}}</td><td><a href="#" class="album">{{metadata.album}}</a></td></tr>');
	// The playlist automatically adds a tr tag.
	this.playlist_item = Handlebars.compile('<td><a href="#" class="play">{{trackname}}</a></td><td><a href="#" class="artist">{{metadata.artist}}</a></td><td><a href="#" class="album">{{metadata.album}}</a></td><td class="track-buttons"><a href="#" class="delete"><img src="/static/icons/delete.png" alt="Delete" title="Delete" /></a></td>');
	this.albums_item = Handlebars.compile('<div class="album-tile" id="albums-album-{{id}}"><a href="#album-tab-{{id}}" title="{{name}} by {{artist.name}}"><img src="/album-cover/{{id}}.jpg" alt="{{name}} by {{artist.name}}" /><br /><span class="album-name">{{name}}</span></div>');
	this.album_tab = Handlebars.compile('<div id="album-tab-{{id}}"><input type="button" value="Add selected" /><table id="album-tab-{{id}}-table" class="track-table"><tbody><tr><td><img src="/static/icons/loading.gif" alt="Loading..." /></td></tr></tbody></table></div>');
	this.album_tabli = Handlebars.compile('<li><a href="{{tabid}}">Album: {{album.name}}</a> <span class="ui-icon ui-icon-close">Remove tab</span></li>');
})();
