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

function search_results(data) {
	var results = $('#search-results');
	results.empty();
	$.each(data, function(i, track) {
		var li = $(templates.directory_item(track));
		console.log(li);
		$(li, 'a').click(function() {
			console.log('clicked');
			playlist.add(track);
			return false;
		});
		results.append(li);
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
			playlist.hintnext();
		}
	});
	$('#search_box').keypress(function(event) {
		if(event.keyCode == 13) {
			var val = $(this).val();
			$.get('/json/search?q=' + escape(val), search_results, 'json');
		}
	});
});
