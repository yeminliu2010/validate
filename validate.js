;(function($, undefined) {

	'use strict';

	var

		// The plugin name.
		name = 'validate',

		// Empty function.
		noop = $.noop,

		// Default properties.
		defaults = {

			// A function called when the form is valid.
			valid : noop,

			// A function called when the form is invalid.
			invalid : noop,

			// A function called before validate form.
			beforeValidate : noop,

			// A function called after validate form.
			afterValidate : noop,

			// A function called for each invalid field.
			eachInvalidField : noop,

			// A function called for each valid field.
			eachValidField : noop,

			// A function called for each field.
			eachField : noop,

			// 
			filter : '*',

			// 
			events : [],

			// 
			selectFirstInvalid : true,

			// 
			sendForm : true,

			// 
			conditional : {},

			// 
			prepare : {},

			//
			valueHook : null,

			// 
			description : {}
		},

		writable = 'input:not([type]),input[type=color],input[type=date],input[type=datetime],input[type=datetime-local],input[type=email],input[type=file],input[type=hidden],input[type=month],input[type=number],input[type=password],input[type=range],input[type=search],input[type=tel],input[type=text],input[type=time],input[type=url],input[type=week],textarea,select',

		checkable = 'input[type=checkbox],input[type=radio]',

		// Fields selector.
		types = writable + ',' + checkable,

		// Extensions.
		validate = {},

		regExpTrue = /^(true|1|)$/,

		// 
		isWrapper = function(attribute) {

			return $(this).parents('*').filter(function() {

				return regExpTrue.test($(this).data(attribute));
			}).length > 0;
		},

		// 
		ifExist = function(value, substitute) {

			return !/^(undefined|null|NaN)$/.test(value) ? value : substitute;
		},

		// 
		namespace = function(events) {

			return events.replace(/(\s+|$)/g, '.' + name + '$1');
		},

		// A function to validate fields.
		validateField = function(options, event) {

			var

				// Current field.
				element = $(this),

				// Current field data.
				data = element.data(),

				// A conditional function.
				fieldConditional = ifExist(data.conditional, validate.conditional),

				// A field id to confirm.
				fieldConfirm = String(ifExist(data.confirm, validate.confirm)),

				// 
				fieldIgnorecase = regExpTrue.test(ifExist(data.ignorecase, validate.ignorecase || isWrapper.call(element, 'ignorecase'))) ? true : false,

				// A mask to field value
				fieldMask = data.mask || validate.mask,

				// 
				fieldMaxlength = ifExist(Number(data.maxlength), validate.maxlength) || Infinity,

				// 
				fieldMinlength = ifExist(Number(data.minlength), validate.minlength) || 0,

				// A regular expression to validate the field value.
				fieldPattern = ifExist(data.pattern, validate.pattern) || /(?:)/,

				// 
				fieldPrepare = ifExist(data.prepare, validate.pattern),

				// 
				fieldRequired = regExpTrue.test(ifExist(data.required, validate.required || isWrapper.call(element, 'required'))) ? true : false,

				// 
				fieldTrim = regExpTrue.test(ifExist(data.trim, validate.trim || isWrapper.call(element, 'trim'))) ? true : false,

				// 
				fieldDescribedby = ifExist(data.describedby, validate.describedby),

				// 
				fieldValidate = data.validate,

				// Current field value
				fieldValue = fieldTrim ? $.trim(element.val()) : element.val(),

				// 
				fieldLength = ifExist(fieldValue, '').length,

				// Current field name
				fieldName = element.prop('name'),

				// 
				sameName = $('[name="' + fieldName + '"]'),

				// Current field status
				status = {
					required : true,
					pattern : true,
					conditional : true,
					confirm : true,
					minlength : true,
					maxlength : true
				},

				valid = true,

				fieldType = element.prop('type'),

				eventType = event ? event.type : null,

				patternModifier = fieldIgnorecase ? 'i' : undefined,

				filled;

			//
			if($.isFunction(options.valueHook)) {

				fieldValue = options.valueHook.call(element, fieldValue);
			}

			// 
			if($.isFunction(fieldPrepare)) {

				fieldValue = fieldPrepare.call(element, fieldValue);
			} else {

				var

					prepare = options.prepare[fieldPrepare];

				fieldValue = $.isFunction(prepare) ? prepare.call(element, fieldValue) : fieldValue;
			}

			// 
			fieldValue = String(fieldValue);

			// 
			if($.type(fieldPattern) === 'regex') {

				fieldPattern = new RegExp(fieldPattern.source, patternModifier);
			} else {

				fieldPattern = new RegExp(fieldPattern, patternModifier);
			}

			// 
			if(element.is(checkable)) {

				filled = fieldName.length > 0 ? sameName.filter(':checked').length > 0 : false;

				status.minlength = sameName.filter(':checked') >= fieldMinlength;

				status.maxlength = sameName.filter(':checked') <= fieldMaxlength;
			} else if(element.is(writable)) {

				filled = fieldLength > 0;

				status.minlength = fieldLength >= fieldMinlength;

				status.maxlength = fieldLength <= fieldMaxlength;

				status.pattern = fieldPattern.test(fieldValue);
			}

			// 
			if(fieldRequired) {

				status.required = filled;
			}

			if(eventType !== 'keyup' && status.pattern && data.mask) {

				var

					shares = fieldValue.match(fieldPattern) || [],

					newValue = String(fieldMask);

				for(var currentShare = 0, sharesLength = shares.length; currentShare < sharesLength; currentShare++) {

					newValue = newValue.replace(new RegExp('(^|[^\\\\])\\$\\{' + currentShare + '(?::`([^`]*)`)?\\}'), shares[currentShare] ? '$1' + shares[currentShare].replace(/\$/g, '$$') : '$1$2');
				}

				newValue = newValue.replace(/(?:^|[^\\])\$\{\d+(?::`([^`]*)`)?\}/g, '$1');

				if(fieldPattern.test(newValue)) {

					element.val(newValue);
				}
			}

			// 
			if(fieldConfirm.length > 0) {

				var

					confirmation =  $('#' + fieldConfirm);

				if(confirmation.length > 0) {

					status.confirm = confirmation.val() === fieldValue;
				}
			}

			// 
			if($.isFunction(fieldConditional)) {

				status.conditional = !!fieldConditional.call(element, fieldValue);
			} else {

				var

					conditionals = String(fieldConditional).split(/\s+/),

					validConditionals = true;

				for(var currentConditional = 0, conditionalLength = conditionals.length; currentConditional < conditionalLength; currentConditional++) {

					var

						conditional = options.conditional[conditionals[currentConditional]];

					if($.isFunction(conditional) && !options.conditional[conditionals[currentConditional]].call(element, fieldValue)) {

						validConditionals = false;
					}
				}

				status.conditional = validConditionals;
			}

			// 
			for(var item in status) {

				if(!status[item]) {

					valid = false;

					break;
				}
			}

			// 
			element.prop('aria-invalid', !valid);

			return {
				valid : valid,
				status : status
			};
		},

		// 
		methods = {
			destroy : function() {

				var

					// 
					element = $(this),

					// 
					fields = element.find(types);

				// 
				if(element.is('[id]')) {

					fields = fields.add($(types).filter('[form="' + element.prop('id') + '"]'));
				}

				// 
				element.add(fields.filter(element.data(name).filter)).removeData(name).off('.' + name);

				return element;
			},
			validate : function(event) {

				var

					// Current form
					element = $(this),

					// Current form data
					data = element.data(name),

					// 
					fields = element.find(types),

					// 
					valid = true,

					// 
					first = true;

				// 
				data.beforeValidate.call(element);

				// 
				if(element.is('[id]')) {

					fields = fields.add($(types).filter('[form="' + element.prop('id') + '"]'));
				}

				// 
				fields.filter(data.filter).each(function() {

					var

						response = validateField.call(this, data, event),

						status = response.status;

					if(response.valid) {

						data.eachValidField.call(this);
					} else {

						valid = false;

						data.eachInvalidField.call(this, status);

						if(first && data.selectFirstInvalid) {

							$(this).trigger('select');
						}

						first = false;
					}

					data.eachField.call(this, status);
				});

				// 
				if(valid) {

					// 
					if(!data.sendForm && event) {

						event.preventDefault();
					}

					// 
					data.valid.call(element);

					// 
					element.trigger('valid');
				} else {

					// 
					if(event) {

						event.preventDefault();
					}

					data.invalid.call(element);

					element.trigger('invalid');
				}

				data.beforeValidate.call(element, valid);

				element.trigger('validated');
			},
			option : function(property, value) {

				var

					// Current form
					element = $(this),

					// Current form data
					data = element.data(name);

				if(typeof property === 'string') {

					if(value !== undefined) {

						element.data(name)[property] = value;
					} else {

						return data[property];
					}
				} else {

					return element.data(name, $.extend({}, data, property));
				}

				return element;
			}
		};

	$[name] = function(property, value) {

		if(typeof property === 'string') {

			if(value !== undefined) {

				defaults[property] = value;
			} else {

				return defaults[property];
			}
		} else {

			return $.extend(defaults, property);
		}

		return defaults;
	};

	$.fn[name] = function() {

		var

			param = arguments;

		return $(this).each(function() {

			var

				element = $(this);

			// Verifies if the current element is a form.
			if(element.is('form')) {

				if(typeof param[0] === 'string' && methods.hasOwnProperty(param[0])) {

					return methods[param[0]].apply(element, Array.prototype.slice.call(param, 1));
				}

				element.data(name, $.extend({}, defaults, param[0])).on(namespace('submit'), function(event) {

					methods.validate.call(this, event);
				});

				var

					data = element.data(name),

					fields = element.find(types);

				if(element.is('[id]')) {

					fields = fields.add($(types).filter('[form="' + element.prop('id') + '"]'));
				}

				fields = fields.filter(data.filter);

				// 
				fields.on(namespace('keyup change blur'), function(event) {

					var

						data = element.data(name);

					if($.inArray(event.type, data.events) > -1) {

						var

							response = validateField.call(this, data, event),

							status = response.status;

						if(response.valid) {

							data.eachValidField.call(this);

							$(this).trigger('valid');
						} else {

							data.eachInvalidField.call(this, status);

							$(this).trigger('invalid');
						}

						data.eachField.call(this, status);

						$(this).trigger('validated');
					}
				});
			}
		});
	};

	// A function to add validation shortcuts
	$[name].add = function(property, value) {

		if(typeof property === 'string') {

			if(value !== undefined) {

				validate[property] = value;
			} else {

				return validate[property];
			}
		} else {

			return $.extend(validate, property);
		}

		return validate;
	};

	// A function to extend the methods
	$[name].extend = function(property, value) {

		if(typeof property === 'string') {

			if(value !== undefined) {

				methods[property] = value;
			} else {

				return methods[property];
			}
		} else {

			return $.extend(methods, property);
		}

		return methods;
	};

	// Stores the plugin version
	$[name].version = '1.2.0';
})(jQuery);