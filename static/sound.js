function playsound(model) {
	playlist.hintnext();
	var item = model.toJSON();
	var id = item.id;
	var cid = model.cid;
	var el = $('#cid-' + cid);
	el.addClass('loading');
	if(sound) {
		sound.stop();
		sound.destruct();
	}
	sound = soundManager.createSound({
		id: 'audio',
		url: '/track/' + id,
		whileloading: function() {
			$('#status').text('Loading... ' + this.bytesLoaded);
			el.addClass('loading');
		},
		onload: function(success) {
			el.removeClass('loading').removeClass('nocache');
			slider = $('#progress').slider({
				max: sound.duration,
				slide: function(event, ui) {
					if(event.originalEvent)
						sound.setPosition(ui.value);
				}
			});
		},
		whileplaying: function() {
			$('#progress').slider("value", sound.position);
			//$('#' + id).addClass('playing');
			//$('#playlist-' + id).addClass('playing');
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
			var next = playlist.next();
			if(next) {
				playsound(next, $('#cid-' + next.cid));
			}
		}
	});
	sound.play();
	$('#cid-' + cid).addClass('playing');
}

function sound_hint(model) {
	$('#cid-' + model.cid).addClass('loading');
	$.get('/json/hint/' + model.id, function(data) {
		$('#cid-' + model.cid).removeClass('nocache').removeClass('loading');
	});
}
