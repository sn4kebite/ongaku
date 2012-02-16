soundManager.useHTML5Audio = true;
soundManager.preferFlash = false;

$(document).ready(function() {
	$.get('/json/list', function(data) {
		var dir_list = $('#directory-list');
		$.each(data, function(i, item) {
			dir_list.append($('<li></li>')
				.text(item.name)
				.addClass(item.type)
				.click(function() {
					console.log(item);
					var sound = soundManager.createSound({
						id: 'audio',
						url: '/track/' + item.id,
						whileplaying: function() {
							var seconds = (sound.position / 1000).toFixed(0);
							var minutes = Math.floor(seconds / 60).toFixed(0);
							seconds %= 60;
							if(seconds < 10)
								seconds = '0' + seconds;
							var pos = minutes + ':' + seconds;
							$('#status').text(pos);
						}
					});
					sound.play();
				})
			);
		});
	});
});
