$(function(){
	PlaylistItem = Backbone.Model.extend({});
	Playlist = Backbone.Collection.extend({
		model: PlaylistItem,
		localStorage: new Store("playlist"),
		comparator: function(item) {
			return item.attributes.order_id;
		}
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
			items.bind('reset', this.addAll, this);
			this.current = null;
			items.fetch();
		},
		add: function(item) {
			item.order_id = items.length+1;
			var model = items.create(item);
			if(items.indexOf(model) < 2) {
				sound_hint(model);
			}
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
			item.destroy();
		},
		addAll: function() {
			items.each(this.addOne);
		},
		next: function() {
			var item = items.at(0);
			var next = items.at(1);
			items.remove(item);
			this.render();
			return next;
		},
		hintnext: function() {
			var next = items.at(1);
			if(next)
				sound_hint(next);
		}
	});

	window.playlist = new PlaylistView;
});
