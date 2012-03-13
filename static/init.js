soundManager.useHTML5Audio = true;
soundManager.preferFlash = false;

var sound = null;

function play() {
	if(sound)
		sound.play();
}

function pause() {
	if(sound)
		sound.togglePause();
}

function preload_images() {
	var cache_images = new Array(
		'loading.gif',
		'music_playing.png'
	);
	$.each(cache_images, function() {
		(new Image()).src = '/static/icons/' + this;
	});
}

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
})();

function load_directory(dir_id, dir_item) {
	$.get('/json/list/' + dir_id, function(data) {
		var dir_list = $('#directory-list');
		dir_list.html('');
		if(dir_item && dir_item.parent) {
			dir_list.append($('<li></li>')
				.addClass('dir')
				.append($('<a></a>')
					.attr('href', '#')
					.text('..')
					.click(function() {
						load_directory(dir_item.parent.id, dir_item.parent);
						return false;
					})
				)
			);
		}
		$.each(data, function(i, item) {
			if(item.type == "track")
				item.nocache = !item.cache;
			var el = $(templates.directory_item(item));
			var id = el.attr('id');
			if(item.type == "track") {
				$(el, 'a').click(function() {
					playlist.add(item);
					return false;
				});
			} else if(item.type == "dir") {
				$(el).click(function() {
					load_directory(item.id, item);
					return false;
				});
			}
			$(el, 'a').click
			dir_list.append(el);
		});
	});
}

$(document).ready(function() {
	$('#tabs').tabs();
	preload_images();
	load_directory(0);
	$('#progress').slider();
	$('#playlist tbody').sortable({
		items: 'tr:not(.playing)',
		cancel: '.playing',
		update: function() {
			$('#playlist tbody tr').each(function(i, tr) {
				var cid = $(tr).attr('id').match(/^cid-(c\d+)$/)[1];
				var model = items.getByCid(cid);
				model.attributes.order_id = i+1;
				model.save();
			});
			items.sort({silent: true});
		}
	});
});
