$(document).ready(function() {
	$.get('/json/list', function(data) {
		var dir_list = $('#directory-list');
		$.each(data, function(i, item) {
			dir_list.append($('<li></li>').text(item.name));
		});
	});
});
