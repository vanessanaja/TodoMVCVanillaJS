/*global jQuery, Handlebars, Router */
// jQuery(function ($) { 
'use strict';
Handlebars.registerHelper('eq', function (a, b, options) {
	return a === b ? options.fn(this) : options.inverse(this);
});

var ENTER_KEY = 13;
var ESCAPE_KEY = 27;

var util = {
	uuid: function () {
		/*jshint bitwise:false */
		var i, random;
		var uuid = '';

		for (i = 0; i < 32; i++) {
			random = Math.random() * 16 | 0;
			if (i === 8 || i === 12 || i === 16 || i === 20) {
				uuid += '-';
			}
			uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
		}

		return uuid;
	},
	pluralize: function (count, word) {
		return count === 1 ? word : word + 's';
	},
	store: function (namespace, data) {
		if (arguments.length > 1) {
			return localStorage.setItem(namespace, JSON.stringify(data));
		} else {
			var store = localStorage.getItem(namespace);
			return (store && JSON.parse(store)) || [];
		}
	}
};

var App = {
	init: function () {
		this.todos = util.store('todos-jquery');
		var getTodoTemplate = document.getElementById('todo-template');
		this.todoTemplate = Handlebars.compile(getTodoTemplate.innerHTML);
		var getFooterTemplate = document.getElementById('footer-template');
		this.footerTemplate = Handlebars.compile(getFooterTemplate.innerHTML);
		this.bindEvents();
		new Router({
			'/:filter': function (filter) {
				this.filter = filter;
				this.render();
			}.bind(this)
		}).init('/all');
	},
	bindEvents: function () {
		var newTodo = document.getElementById('new-todo');
		newTodo.addEventListener('keyup', this.create.bind(this));

		var toggleAll = document.getElementById('toggle-all');
		toggleAll.addEventListener('click', this.toggleAll.bind(this));

		var getFooter = document.getElementById('footer');
		getFooter.addEventListener('click', function (event) {
			if (event.target.id === 'clear-completed')
				this.destroyCompleted(event);
		}.bind(this));
		var todoList = document.getElementById('todo-list');
		todoList.addEventListener('change', function (event) {
			if (event.target.className === 'toggle') {
				this.toggle(event);
			}
		}.bind(this));
		todoList.addEventListener('dblclick', function (event) {
			if (event.target.localName === 'label') {
				this.edit(event);
			}
		}.bind(this));
		todoList.addEventListener('keyup', function (event) {
			this.editKeyup(event);
		}.bind(this));
		todoList.addEventListener('focusout', function (event) {
			if (event.target.className === 'edit') {
				this.update(event);
			}
		}.bind(this));
		todoList.addEventListener('click', function (event) {
			if (event.target.className === 'destroy') {
				this.destroy(event);
			}
		}.bind(this));
	},
	render: function () {
		var todos = this.getFilteredTodos();
		var getTodoList = document.getElementById('todo-list');
		getTodoList.innerHTML = this.todoTemplate(todos);
		var main = document.getElementById('main');
		if (todos.length > 0) {
			main.style.display = 'block';
		} else {
			main.style.display = 'none';
		};
		// sets the checked property of element with toggle-all id. if active todos are 0 it'll set checked as true
		// otherwise, it'll be false and toggle all will not be checked.
		var getToggleAll = document.getElementById('toggle-all');
		if (this.getActiveTodos().length === 0) {
			getToggleAll.checked = true;
		} else {
			getToggleAll.checked = false;
		}
		this.renderFooter();
		var newTodo = document.getElementById('new-todo');
		newTodo.focus();
		util.store('todos-jquery', this.todos);
	},
	renderFooter: function () {
		var todoCount = this.todos.length;
		var activeTodoCount = this.getActiveTodos().length;
		var template = this.footerTemplate({
			activeTodoCount: activeTodoCount,
			activeTodoWord: util.pluralize(activeTodoCount, 'item'),
			completedTodos: todoCount - activeTodoCount,
			filter: this.filter
		});
		var getFooter = document.getElementById('footer');
		if (todoCount > 0) {
			getFooter.innerHTML = (template);
			getFooter.style.display = ('block');
		}
	},
	toggleAll: function (elementClicked) {
		var elementClicked = event.target
		var isChecked = elementClicked.checked
		this.todos.forEach(function (todo) {
			todo.completed = isChecked;
		});
		this.render();
	},

	getActiveTodos: function () {
		return this.todos.filter(function (todo) {
			return !todo.completed;
		});
	},
	getCompletedTodos: function () {
		return this.todos.filter(function (todo) {
			return todo.completed;
		});
	},
	getFilteredTodos: function () {
		if (this.filter === 'active') {
			return this.getActiveTodos();
		}
		if (this.filter === 'completed') {
			return this.getCompletedTodos();
		}
		return this.todos;
	},
	destroyCompleted: function () {
		this.todos = this.getActiveTodos();
		this.filter = 'all';
		this.render();
	},
	indexFromEl: function (el) {
		var id = el.offsetParent.dataset.id;
		var todos = this.todos;
		var i = todos.length;
		while (i--) {
			if (todos[i].id === id) {
				return i;
			}
		}
	},
	create: function (e) {
		var input = document.getElementById('new-todo');
		var val = input.value.trim();
		if (e.which !== ENTER_KEY || !val) {
			return;
		};
		this.todos.push({
			id: util.uuid(),
			title: val,
			completed: false
		});
		input.value = '';
		this.render();
	},
	toggle: function (e) {
		var i = this.indexFromEl(event.target);
		this.todos[i].completed = !this.todos[i].completed;
		this.render();
	},
	edit: function (e) {
		var elementClicked = event.target.closest('li');
		var addClass = elementClicked.classList.add('editing');
		var input = elementClicked.querySelector('.edit');
		input.focus();
	},
	editKeyup: function (e) {
		if (e.which === ENTER_KEY) {
			e.target.blur();
		}
		if (e.which === ESCAPE_KEY) {
			e.target.setAttribute('abort', true);
			e.target.blur();
		}
	},
	update: function (e) {
		var el = e.target;
		var val = el.value.trim();
		if (!val) {
			this.destroy(e);
			return;
		}
		if (e.target.getAttribute('abort', true)) {
			e.target.setAttribute('abort', false);
		} else {
			this.todos[this.indexFromEl(el)].title = val;
		}
		this.render();
	},
	destroy: function (elementClicked) {
		var elementClicked = event.target;
		this.todos.splice(this.indexFromEl(elementClicked), 1);
		this.render();
	}
};

App.init();