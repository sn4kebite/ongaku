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
		// FIXME: Lots of duplicate code in here.
		$.each(data, function(i, item) {
			var el = $(templates.track_item(item));
			var id = el.attr('id');
			if(item.type == "track") {
				el.data('track', item);
				$(el, 'a.play').dblclick(function() {
					console.log('track dblclick:', item);
					playlist.add(item);
					return true;
				}).click(function(event) {
					// TODO: Check that doing this doesn't cause any weird bugs with selectable.
					if(!event.ctrlKey)
						track_list.find('.ui-selected').removeClass('ui-selected');
					$(el).addClass('ui-selected');
					$('#directory-add').prop('disabled', track_list.find('.ui-selected').length == 0);
					return false;
				});
				el.find('a.artist').click(function() {
					var artist = {
						id: item.metadata.artist_id,
						name: item.metadata.artist
					};
					show_artist(artist);
					return false;
				});
				el.find('a.album').click(function() {
					var album = {
						id: item.metadata.album_id,
						name: item.metadata.album
					};
					show_album(album);
					return false;
				});
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
			distance: 5,
			stop: function(event, ui) {
				$('#directory-add').prop('disabled', track_list.find('.ui-selected').length == 0);
				return true;
			}
		});
	});
	$('#directory-add').prop('disabled', true);
}

function set_tracks(container, select, click) {
	return (function(tracks) {
		container.empty();
		$.each(tracks, function(i, track) {
			var el = $(templates.track_item(track));
			el.data('track', track);
			el.find('a.track').dblclick(function() {
				playlist.add(track);
				return true;
			}).click(function(event) {
				if(click !== undefined)
					return click(event, track);
				// TODO: Check that doing this doesn't cause any weird bugs with selectable.
				if(!event.ctrlKey)
					container.find('.ui-selected').removeClass('ui-selected');
				$(el).addClass('ui-selected');
				select.prop('disabled', container.find('.ui-selected').length == 0);
				return false;
			});
			el.find('a.artist').click(function(event) {
				var artist = {
					id: track.metadata.artist_id,
					name: track.metadata.artist
				};
				show_artist(artist);
				return false;
			});
			el.find('a.album').click(function(event) {
				var album = {
					id: track.metadata.album_id,
					name: track.metadata.album
				};
				show_album(album);
				return false;
			});
			container.append(el);
		});
		container.selectable({
			filter: 'tr',
			distance: 5,
			stop: function(event, ui) {
				select.prop('disabled', $(container, '.ui-selected').length == 0);
				return true;
			}
		});
		select.prop('disabled', true);
	});
}

function show_artist(artist) {
	var tabs = $('#tabs');
	var tabid = '#artist-tab-' + artist.id;
	var tab = $(tabid);
	if(tab.length > 0) {
		tabs.tabs('select', tab.index()-1);
		return;
	}
	var tabli = $(templates.artist_tabli({tabid: tabid, artist: artist}));
	tabs.find('.ui-tabs-nav').append(tabli);
	var tab = $(templates.artist_tab(artist));
	tabs.append(tab).tabs('refresh');
	$.get('/json/artist/' + artist.id, function(data) {
		var albums = [];
		$.each(data.albums, function(i, album) {
			album.artist = {id: data.id, name: data.name};
			albums.push(album);
		});
		tab.empty();
		add_albums(tabid, albums);
	}, 'json');
	tabs.tabs('select', tab.index()-1);
}

function show_album(album) {
	var tabs = $('#tabs');
	var tabid = '#album-tab-' + album.id;
	var tab = $(tabid);
	if(tab.length > 0) {
		tabs.tabs('select', tab.index()-1);
		return;
	}
	var tabli = $(templates.album_tabli({tabid: tabid, album: album}));
	tabs.find('.ui-tabs-nav').append(tabli);
	var tab = $(templates.album_tab(album));
	tabs.append(tab).tabs('refresh');
	var tracks = $(tabid + '-table tbody');
	var addbutton = $(tab).find('input');
	addbutton.click(function() {
		var tracks = $(tabid + '-table tbody tr.ui-selected');
		tracks.each(function(i, item) {
			var track = $(item).data('track');
			playlist.add(track);
		});
	});
	$.get('/json/album/' + album.id, set_tracks(tracks, addbutton), 'json');
	tabs.tabs('select', tab.index()-1);
}

function add_albums(selector, data) {
	var div = $(selector);
	$.each(data, function(i, album) {
		var el = $(templates.albums_item(album));
		el.find('a').click(function() {
			show_album(album);
			return false;
		});
		div.append(el);
	});
}

function setup_album_scrolling() {
	$('#albums-tab').scroll(function(event) {
		if(albums_end)
			return;
		var scrolltop = event.target.scrollTop;
		var scrollheight = event.target.scrollHeight;
		var height = $(event.target).height();
		var remaining = (scrollheight - height) - scrolltop;
		if(remaining < 150 && !albums_loading) {
			load_albums();
		}
	});
}

var albums_page = 0;
var albums_loading = false;
var albums_end = false;
function load_albums(initiate_scrolling) {
	var page = albums_page;
	albums_page++;
	albums_loading = true;
	$.get('/json/albums/' + page, function(data) {
		if(data.length > 0)
			add_albums('#albums-list', data);
		else
			albums_end = true;
		if(initiate_scrolling == true)
			setup_album_scrolling();
		albums_loading = false;
	}, 'json');
}

$(document).ready(function() {
	var albums_initially_loaded = false;
	$('#tabs').tabs({
		activate: function(event, ui) {
			if(ui.newPanel.selector == '#albums-tab') {
				if(!albums_initially_loaded) {
					load_albums(true);
					albums_initially_loaded = true;
				}
			}
		}
	});
	// Shamlessly stolen from the tabs manipulation example: http://jqueryui.com/tabs/#manipulation
	$('#tabs span.ui-icon-close').live('click', function() {
		var panelid = $(this).closest('li').remove().attr('aria-controls');
		$('#' + panelid).remove();
		$('#tabs').tabs('refresh');
	});
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
			$('#search-results').empty();
			$('#search-results').append('<tr><td colspan="3"><img src="/static/icons/loading.gif" alt="Searching..." /> Searching...</td></tr>');
			var val = $(this).val();
			$.get('/json/search?q=' + encodeURIComponent(val), function(data) {
				var s = 'Showing ' + data.results.length;
				if(data.total > data.results.length)
					s += ' of ' + data.total;
				s += ' results.';
				$('#search-info').text(s);
				set_tracks($('#search-results'), $('#search-add'))(data.results);
			}, 'json');
		}
	});
	$('#search-add').click(function(event) {
		var tracks = $('#search-results tr.ui-selected');
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
