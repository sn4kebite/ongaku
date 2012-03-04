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
					el.addClass('loading');
					if(sound) {
						sound.stop();
						sound.destruct();
					}
					sound = soundManager.createSound({
						id: 'audio',
						url: '/track/' + item.id,
						whileloading: function() {
							$('#status').text('Loading... ' + this.bytesLoaded);
						},
						onload: function(success) {
							el.removeClass('loading').removeClass('nocache');
						},
						whileplaying: function() {
							$('#' + id).addClass('playing');
							var seconds = (this.position / 1000).toFixed(0);
							var minutes = Math.floor(seconds / 60).toFixed(0);
							seconds %= 60;
							if(seconds < 10)
								seconds = '0' + seconds;
							var pos = minutes + ':' + seconds;
							$('#status').text(pos);
						},
						onstop: function() {
							$('#' + id).removeClass('playing');
						},
						onfinish: function() {
							$('#' + id).removeClass('playing');
						}
					});
					sound.play();
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
	preload_images();
	load_directory(0);
});
