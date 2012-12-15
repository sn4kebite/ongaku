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
		var dir_list = $('#directory-dirs');
		var track_list = $('#directory-tracks');
		dir_list.html('');
		track_list.html('');
		if(dir_item && dir_item.parent) {
			dir_list.append($('<tr></tr>').append($('<td></td>').attr('colspan', 3)
				.append($('<a></a>')
					.addClass('dir')
					.attr('href', '#')
					.text('..')
					.click(function() {
						load_directory(dir_item.parent.id, dir_item.parent);
						return false;
					})
				))
			);
		}
		$.each(data, function(i, item) {
			var el = $(templates.directory_item(item));
			var id = el.attr('id');
			if(item.type == "track") {
				el.data('track', item);
				// FIXME: This doesn't work with selectable
				/*$(el, 'a').dblclick(function() {
					console.log('track: ', item);
					playlist.add(item);
					return true;
				}).click(function() {
					return false;
				});*/
				track_list.append(el);
			} else if(item.type == "dir") {
				$(el).click(function() {
					load_directory(item.id, item);
					return false;
				});
				dir_list.append(el);
			}
		});
		track_list.selectable({
			filter: 'tr',
			stop: function(event, ui) {
				$('#directory-add').prop('disabled', $(track_list, ' .ui-selected').length == 0);
				return true;
			}
		});
	});
	$('#directory-add').prop('disabled', true);
}

function search_results(data) {
	var results = $('#search-results');
	results.empty();
	$.each(data, function(i, track) {
		var item = $(templates.directory_item(track));
		item.data('track', track);
		results.append(item);
	});
	results.selectable({
		filter: 'tr',
		stop: function(event, ui) {
			$('#search-add').prop('disabled', results.children().length == 0);
			return true;
		}
	});
	$('#search-add').prop('disabled', true);
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
			$.get('/json/search?q=' + encodeURIComponent(val), search_results, 'json');
		}
	});
	$('#search-add').click(function(event) {
		var tracks = $('#search-results tr.ui-selected');
		console.log(tracks);
		tracks.each(function(i, item) {
			var track = $(item).data('track');
			playlist.add(track);
		});
	}).prop('disabled', true);
	$('#directory-add').click(function(event) {
		var tracks = $('#directory-tracks tr.ui-selected');
		tracks.each(function(i, item) {
			var track = $(item).data('track');
			playlist.add(track);
		});
	}).prop('disabled', true);
});
