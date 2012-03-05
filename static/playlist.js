$(function(){
	PlaylistItem = Backbone.Model.extend({});
	Playlist = Backbone.Collection.extend({
		model: PlaylistItem,
		localStorage: new Store("playlist")
	});
	window.items = new Playlist;
	PlaylistItemView = Backbone.View.extend({
		tagName: 'li',
		template: Handlebars.compile('<a href="#">{{trackname}}</a>'),
		render: function() {
			var model = this.model;
			var item = model.toJSON();
			var el = $(this.el);
			el.html(this.template(item));
			el.attr('id', 'cid-' + model.cid);
			$(this.el, 'a').click(function() {
				while(model.collection.indexOf(model) > 0) {
					model.collection.remove(model.collection.at(0));
				}
				playsound(model);
				return false;
			});
			return this;
		}
	});
	PlaylistView = Backbone.View.extend({
		el: $('#playlist'),
		initialize: function() {
			items.bind('add', this.addOne, this);
			items.bind('remove', this.removeOne, this);
			this.current = null;
		},
		add: function(item) {
			var model = items.create(item);
		},
		addOne: function(item) {
			var view = new PlaylistItemView({model: item});
			var el = view.render().el;
			if(item.attributes.nocache)
				$(el).addClass('nocache');
			$('#playlist').append(el);
		},
		removeOne: function(item) {
			$('#playlist #cid-' + item.cid).remove();
		},
		next: function() {
			var item = items.at(0);
			var next = items.at(1);
			items.remove(item);
			this.render();
			return next;
		}
	});

	window.playlist = new PlaylistView;
});
