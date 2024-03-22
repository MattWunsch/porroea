import React from 'react';
import Fuse from 'fuse.js';

var Component = React.createClass({

	displayName: 'SelectSearch',

	hideTimer: null,

	focus: false,

	selected: null,

	classes: {},

	itemHeight: null,

	selectHeight: null,

	getInitialState() {
		return {
			search:  null,
			value:   (!this.props.value && this.props.multiple) ? [] : this.props.value,
			options: this.props.options
		};
	},

	getDefaultProps() {
		return {
			options:        [],
			className:      'select-search-box',
			search:         true,
			value:          null,
			placeholder:    null,
			multiple:       false,
			height:         200,
			name:           null,
			fuse: {
				keys:           ['name'],
				threshold:      0.3
			},
			valueChanged:   function () {},
			optionSelected: function () {},
			onMount:        function () {},
			onBlur:         function () {},
			onFocus:        function () {},
			renderOption:   function (option) {
				return option.name;
			}
		};
	},

	componentWillMount() {
		this.classes = {
			container: (this.props.multiple) ? this.props.className + ' ' + this.m('multiple', this.props.className) : this.props.className,
			search:    this.e('search'),
			select:    this.e('select'),
			options:   this.e('options'),
			option:    this.e('option'),
			out:       this.e('out'),
			label:     this.e('label')
		};
	},

	componentDidMount() {
		this.props.onMount.call(this);

		if (!this.props.search) {
			document.addEventListener('click', this.documentClick);
		}
	},

	componentDidUpdate(prevProps, prevState) {
		if (this.refs.hasOwnProperty('search') && this.state.value !== prevState.value) {
			this.refs.search.getDOMNode().blur();
		}
	},

	documentClick(e) {
		if (e.target.className.indexOf(this.props.className) < 0) {
			this.onBlur();
		}
	},

	filterOptions(options, value) {
		if (options && options.length > 0 && value && value.length > 0) {
			var fuse         = new Fuse(options, this.props.fuse),
				foundOptions = fuse.search(value);

			return foundOptions;
		}

		return options;
	},

	e(element, base) {
		base || (base = this.props.className);

		return base + '__' + element;
	},

	m(modifier, base) {
		modifier = modifier.split(' ');
		var finalClass = [];

		modifier.forEach(function (className) {
			finalClass.push(base + '--' + className);
		});

		return finalClass.join(' ');
	},

	onChange(e) {
		var value = e.target.value, foundOptions = this.filterOptions(this.props.options, value);

		this.selected = null;

		this.setState({options: foundOptions, search: value});
	},

	onFocus() {
		var className, element, viewportHeight, elementPos;

		clearTimeout(this.hideTimer);

		this.focus = true;
		this.setState({search: null, options: this.props.options});

		if (!this.props.multiple && this.refs.hasOwnProperty('select')) {
			element   = this.refs.select.getDOMNode();
			className = this.classes.select + ' ' + this.m('display', this.classes.select);

			element.className = className + ' ' + this.m('prehide', this.classes.select);

			setTimeout(function () {
				viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
				elementPos     = element.getBoundingClientRect();
				this.selectHeight  = viewportHeight - elementPos.top - 20;

				element.style.maxHeight = this.selectHeight + 'px';

				if (!this.itemHeight) {
					this.itemHeight = element.querySelector('.' + this.classes.option).offsetHeight;
				}

				element.className = className;
				element.scrollTop = 0;
			}.bind(this), 50);
		}

		this.props.onFocus.call(this);
	},

	onBlur(e) {
		var element, option;

		this.focus = false;
		this.selected = null;

		option = this.findByValue(this.props.options, this.state.value);

		if (option) {
			this.setState({search: option.name});
		}

		this.props.onBlur.call(this);

		if (!this.props.multiple && this.refs.hasOwnProperty('select')) {
			element = this.refs.select.getDOMNode();
			element.className = this.classes.select + ' ' + this.m('prehide', this.classes.select) + ' ' + this.m('display', this.classes.select);

			this.hideTimer = setTimeout(function () {
				element.className = this.classes.select;
				this.setState({options: []});
			}.bind(this), 200);
		}
	},

	onKeyPress(e) {
		if (!this.state.options || this.state.options.length < 1) {
			return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();

			var selectedOption = (this.selected) ? this.optionByIndex(this.selected) : this.optionByIndex(0);

			if (selectedOption) {
				this.chooseOption(selectedOption.value);
			}
		}
	},

	onKeyDown(e) {
		if (!this.state.options || this.state.options.length < 1) {
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();

			if (typeof this.selected === 'undefined' || this.selected === null) {
				this.selectOption(0, true);
			} else {
				this.selectOption(this.selected + 1, true);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();

			if (typeof this.selected === 'undefined' || this.selected === null) {
				this.selectOption(this.state.options.length - 1);
			} else {
				this.selectOption(this.selected - 1);
			}
		}

		this.scrollToSelected();
	},

	scrollToSelected() {
		var select = this.refs.select.getDOMNode();
		select.scrollTop = this.itemHeight * this.selected;
	},

	optionByIndex(index) {
		var option = null;

		this.state.options.every(function (object, i) {
			if (index === i) {
				option = object;
				return false;
			}

			return true;
		});

		return option;
	},

	findByValue(source, value) {
		if ((!source || source.length < 1) && (!this.state.search || this.state.search.length < 1)) {
			source = this.props.options;
		}

		return source.filter(function (object) {
			return object.value === value;
		})[0];
	},

	selectOption(value, down) {
		var optionsParent = this.refs.selectOptions.getDOMNode(),
			options       = optionsParent.childNodes,
			className     = this.classes.option,
			selectedClass = className + ' ' + className + '--' + 'hover',
			totalOptions  = options.length,
			selected      = null,
			selectedNodeName,
			i,
			node;

		for (i = 0; i < totalOptions; i += 1) {
			node = options[i];

			if (i === value) {
				if (node.getAttribute('data-value') === this.state.value) {
					node.className = className + ' ' + className + '--' + 'selected';
				} else {
					node.className = selectedClass;
				}

				selectedNodeName = node.textContent;
				selected = i;
			} else {
				if (node.getAttribute('data-value') === this.state.value) {
					node.className = className + ' ' + className + '--' + 'selected';
				} else {
					node.className = className;
				}
			}
		}

		if (!selectedNodeName) {
			selectedNodeName = this.state.search;
		}

		this.selected = selected;
		this.props.optionSelected(selected, this.state, this.props);
	},

	chooseOption(value) {
		var currentValue = this.state.value,
			search,
			option;

		if (!value) {
			option = this.state.options[0];
		} else {
			option = this.findByValue(this.props.options, value);
		}

		if (this.props.multiple) {
			if (!currentValue) {
				currentValue = [];
			}

			currentValue.push(option.value);

			search = null;
		} else {
			currentValue = option.value;
			search = option.name;
		}

		this.setState({value: currentValue, search: search, options: this.props.options});
		this.props.valueChanged.call(this, option, this.state, this.props);

		if (!this.props.search) {
			this.onBlur();
		}
	},

	removeOption(value) {
		if (!value) {
			return false;
		}

		var option = this.findByValue(this.props.options, value),
			value  = this.state.value;

		if (!option || value.indexOf(option.value) < 0) {
			return false;
		}

		value.splice(value.indexOf(option.value), 1);

		this.props.valueChanged(null, this.state, this.props);
		this.setState({value: value, search: null});
	},

	renderOptions() {
		var foundOptions,
			select = null,
			option = null,
			options = [],
			selectStyle = {};

		foundOptions = this.state.options;

		if (foundOptions && foundOptions.length > 0) {
			if (this.state.value && !this.props.multiple) {
				option = this.findByValue(this.props.options, this.state.value);

				if (option) {
					options.push(<li className={this.classes.option + ' ' + this.m('selected', this.classes.option)} onClick={this.chooseOption.bind(this, option.value)} key={option.value + '-option'} data-value={option.value} dangerouslySetInnerHTML={{__html: this.props.renderOption(option)}} />);
				}
			}

			foundOptions.forEach((element) => {
				if (this.props.multiple) {
					if (this.state.value.indexOf(element.value) < 0) {
						options.push(<li className={this.classes.option} onClick={this.chooseOption.bind(this, element.value)} key={element.value + '-option'} data-value={element.value} dangerouslySetInnerHTML={{__html: this.props.renderOption(element)}} />);
					} else {
						options.push(<li className={this.classes.option + ' ' + this.m('selected', this.classes.option)} onClick={this.removeOption.bind(this, element.value)} key={element.value + '-option'} data-value={element.value} dangerouslySetInnerHTML={{__html: this.props.renderOption(element)}} />);
					}
				} else {
					if (element.value !== this.state.value) {
						options.push(<li className={this.classes.option} onClick={this.chooseOption.bind(this, element.value)} key={element.value + '-option'} data-value={element.value} dangerouslySetInnerHTML={{__html: this.props.renderOption(element)}} />);
					}
				}
			});

			if (options.length > 0) {
				select = (
					<ul ref="selectOptions" className={this.classes.options}>
						{options}
					</ul>
				);
			}
		}

		if (this.props.multiple) {
			selectStyle.height = this.props.height;
		}

		return (
			<div ref="select" className={this.classes.select} style={selectStyle}>
				{select}
			</div>
		);
	},

	renderOutElement() {
		var option = null,
			finalValue,
			finalValueOptions;

		if (this.props.multiple) {
			if (this.state.value) {
				finalValueOptions = [];

				this.state.value.forEach((value, i) => {
					option = this.findByValue(this.props.options, value);
					finalValueOptions.push(<option key={i} value={option.value}>{option.name}</option>);
				});

				finalValue = (
					<select value={this.state.value} className={this.classes.out} name={this.props.name} multiple>
						{finalValueOptions}
					</select>
				);
			} else {
				finalValue = (
					<select className={this.classes.out} name={this.props.name} multiple>
						<option>Nothing selected</option>
					</select>
				);
			}
		} else {
			finalValue = <input type="hidden" value={this.state.value} name={this.props.name} />;
		}

		return finalValue;
	},

	renderSearchField() {
		var option,
			searchField,
			labelValue,
			labelClassName;

		if (this.props.search) {
			searchField = <input ref="search" onFocus={this.onFocus} onKeyDown={this.onKeyDown} onKeyPress={this.onKeyPress} onBlur={this.onBlur} className={this.classes.search} type="search" value={this.state.search} onChange={this.onChange} placeholder={this.props.placeholder} />;
		} else {
			if (!this.state.value) {
				labelValue     = this.props.placeholder;
				labelClassName = this.classes.search + ' ' + this.m('placeholder', this.classes.search);
			} else {
				option         = this.findByValue(this.props.options, this.state.value);
				labelValue     = option.name;
				labelClassName = this.classes.search;
			}

			searchField = <strong onClick={this.onFocus} className={labelClassName}>{labelValue}</strong>;
		}

		return searchField;
	},

	render() {
		return (
			<div className={this.classes.container}>
				{this.renderOutElement()}
				{this.renderSearchField()}
				{this.renderOptions()}
			</div>
		);
	}

});

export default Component;
