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

var templates = new (function Templates() {
	this.directory_item = Handlebars.compile('<li class="{{type}}"><a href="#">{{name}}</a>');
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
			var el = $(templates.directory_item(item));
			if(item.type == "track") {
				$(el, 'a').click(function() {
					console.log(item);
					if(sound) {
						sound.destruct();
					}
					sound = soundManager.createSound({
						id: 'audio',
						url: '/track/' + item.id,
						whileloading: function() {
							$('#status').text('Loading... ' + this.bytesLoaded);
						},
						whileplaying: function() {
							var seconds = (this.position / 1000).toFixed(0);
							var minutes = Math.floor(seconds / 60).toFixed(0);
							seconds %= 60;
							if(seconds < 10)
								seconds = '0' + seconds;
							var pos = minutes + ':' + seconds;
							$('#status').text(pos);
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
	load_directory(0);
});
