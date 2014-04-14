/*global MAPJS, jQuery, describe, it, beforeEach, afterEach, _, expect, navigator, jasmine, Color, spyOn, observable*/

beforeEach(function () {
	'use strict';
	jasmine.addMatchers({
		toHaveBeenCalledOnJQueryObject: function () {
			return {
				compare: function (actual, expected) {
					return {
						pass: actual.calls && actual.calls.mostRecent() && actual.calls.mostRecent().object[0] === expected[0]
					};
				}
			};
		}
	});
});
describe('getBox', function () {
	'use strict';
	var underTest;
	beforeEach(function () {
		underTest = jQuery('<div>').appendTo('body').css({
			position: 'absolute',
			top: '200px',
			left: '300px',
			width: '150px',
			height: '20px'
		});

	});
	afterEach(function () {
		underTest.remove();
	});
	it('retrieves offset box from a DOM element', function () {
		expect(underTest.getBox()).toEqual({
			top: 200,
			left: 300,
			width: 150,
			height: 20
		});
	});
	it('retrieves the offset box from the first element of a jQuery selector', function () {
		var another = jQuery('<div>');
		expect(underTest.add(another).getBox()).toEqual({
			top: 200,
			left: 300,
			width: 150,
			height: 20
		});
	});
	it('returns false if selector is empty', function () {
		expect(jQuery('#non-existent').getBox()).toBeFalsy();
	});
});
describe('getDataBox', function () {
	'use strict';
	var underTest, stage;
	beforeEach(function () {
		stage = jQuery('<div>').appendTo('body');
		underTest = jQuery('<div>').appendTo(stage).css({
			position: 'absolute',
			top: '200px',
			left: '300px',
			width: '150px',
			height: '20px'
		}).data({
			x: 11,
			y: 12,
			width: 13,
			height: 14
		});
	});
	afterEach(function () {
		underTest.remove();
		stage.remove();
	});
	it('retrieves a pre-calculated box from data attributes if they are present', function () {
		expect(underTest.getDataBox()).toEqual({
			left: 11,
			top: 12,
			width: 13,
			height: 14
		});
	});
	it('ignores stage offset and zoom', function () {
		stage.data({'offsetX': 200, 'offsetY': 300, 'scale': 2});
		expect(underTest.getDataBox()).toEqual({
			left: 11,
			top: 12,
			width: 13,
			height: 14
		});
	});
	_.each(['width', 'height'], function (attrib) {
		it('falls back to DOM boxing if data attribute ' + attrib + ' is not present', function () {
			underTest.data(attrib, '');
			expect(underTest.getDataBox()).toEqual({
				top: 200,
				left: 300,
				width: 150,
				height: 20
			});
		});
	});
	it('returns false if selector is empty', function () {
		expect(jQuery('#non-existent').getDataBox()).toBeFalsy();
	});
});
describe('animateConnectorToPosition', function () {
	'use strict';
	var from, to, connector;
	beforeEach(function () {
		from = jQuery('<div>').attr('id', 'fromC').appendTo('body').css({position: 'absolute', width: 50, height: 60, left: 70, top: 80}).data({width: 50, height: 60, x: 70, y: 80});
		to = jQuery('<div>').attr('id', 'toC').appendTo('body').css({position: 'absolute', width: 90, height: 100, left: 110, top: 120}).data({width: 90, height: 100, x: 110, y: 120});
		connector = jQuery('<div>').data({'nodeFrom': from, 'nodeTo': to}).appendTo('body');
		spyOn(jQuery.fn, 'animate').and.callThrough();
	});
	afterEach(function () {
		from.add(to).add(connector).remove();
	});
	describe('optimises connector transformations to simple animations if possible', function () {
		it('when dataBox and real dom boxes for connecting element have just moved by the same offset', function () {
			from.data('x', from.data('x') + 20);
			from.data('y', from.data('y') + 30);
			to.data('x', to.data('x') + 20);
			to.data('y', to.data('y') + 30);
			var result = connector.animateConnectorToPosition({ duration : 230, queue : 'animQueue' });
			expect(result).toBeTruthy();
			expect(jQuery.fn.animate).toHaveBeenCalledWith({ left : 90, top : 110 }, { duration : 230, queue : 'animQueue'});
		});
		it('when the movement difference  is less than threshold (to avoid small rounding errors)', function () {
			from.data('x', from.data('x') + 22);
			from.data('y', from.data('y') + 30);
			to.data('x', to.data('x') + 20);
			to.data('y', to.data('y') + 33);
			var result = connector.animateConnectorToPosition({ duration : 230, queue : 'animQueue' }, 5);
			expect(result).toBeTruthy();
			expect(jQuery.fn.animate).toHaveBeenCalledWith({ left : 92, top : 110 }, { duration : 230, queue : 'animQueue'});
		});
		it('rounds the coordinates to avoid performance problems', function () {
			from.data('x', from.data('x') + 20.1);
			from.data('y', from.data('y') + 30.3);
			to.data('x', to.data('x') + 20.3);
			to.data('y', to.data('y') + 30.1);
			var result = connector.animateConnectorToPosition({ duration : 230, queue : 'animQueue' });
			expect(result).toBeTruthy();
			expect(jQuery.fn.animate).toHaveBeenCalledWith({ left : 90, top : 110 }, { duration : 230, queue : 'animQueue'});
		});
	});
	describe('returns false and does not schedule animations if box differences are nor resolvable using simple translation', function () {
		it('when orientation changes', function () {
			var fromData = _.clone(from.data());
			from.data(to.data());
			to.data(fromData);
			var result = connector.animateConnectorToPosition();
			expect(result).toBeFalsy();
			expect(jQuery.fn.animate).not.toHaveBeenCalled();
		});
		_.each(['fromC', 'toC'], function (changeId) {
			_.each(['width', 'height', 'x', 'y'], function (attrib) {
				it('when node boxes change independently (' + changeId + ' ' + attrib, function () {
					var changeOb = jQuery('#' + changeId), result;
					changeOb.data(attrib, changeOb.data(attrib) + 5.1);
					result = connector.animateConnectorToPosition({}, 5);
					expect(result).toBeFalsy();
					expect(jQuery.fn.animate).not.toHaveBeenCalled();
				});
			});
		});

	});

});

describe('updateConnector', function () {
	'use strict';
	var underTest, fromNode, toNode, third, anotherConnector;
	beforeEach(function () {
		fromNode = jQuery('<div>').attr('id', 'node_fr').css({ position: 'absolute', top: '100px', left: '200px', width: '100px', height: '40px'}).appendTo('body');
		toNode = jQuery('<div>').attr('id', 'node_to').css({ position: 'absolute', top: '220px', left: '330px', width: '12px', height: '44px'}).appendTo('body');
		underTest = MAPJS.createSVG().appendTo('body').attr('data-role', 'test-connector').css('position', 'absolute').data({'nodeFrom': fromNode, 'nodeTo': toNode});
		third = jQuery('<div>').attr('id', 'node_third').css({ position: 'absolute', top: '330px', left: '220px', width: '119px', height: '55px'}).appendTo('body');
		anotherConnector = MAPJS.createSVG().appendTo('body').attr('data-role', 'test-connector').css('position', 'absolute').data({'nodeFrom': fromNode, 'nodeTo': third});
	});
	it('returns itself for chaining', function () {
		expect(underTest.updateConnector()[0]).toEqual(underTest[0]);
	});
	it('draws a cubic curve between the centers of two nodes', function () {
		underTest.updateConnector();
		var path = underTest.find('path');
		expect(path.length).toBe(1);
		expect(path.attr('class')).toEqual('mapjs-connector');
		expect(path.attr('d')).toEqual('M50,20Q50,202 130,142');
	});
	it('positions the connector to the upper left edge of the nodes, and expands it to the bottom right edge of the nodes', function () {
		underTest.updateConnector();
		expect(underTest.css('top')).toEqual('100px');
		expect(underTest.css('left')).toEqual('200px');
		expect(underTest.css('height')).toEqual('164px');
		expect(underTest.css('width')).toEqual('142px');
	});
	it('updates the existing curve if one is present', function () {
		var path = MAPJS.createSVG('path').appendTo(underTest);
		underTest.updateConnector();
		expect(underTest.find('path').length).toBe(1);
		expect(underTest.find('path')[0]).toEqual(path[0]);
	});

	it('updates multiple connectors at once', function () {
		jQuery('[data-role=test-connector]').updateConnector();
		expect(underTest.find('path').attr('d')).toEqual('M50,20Q50,202 130,142');
		expect(anotherConnector.find('path').attr('d')).toEqual('M50,20Q50,318 20,258');
	});
	describe('performance optimisations', function () {
		it('rounds coordinates', function () {
			anotherConnector.updateConnector();
			expect(anotherConnector.find('path').attr('d')).toEqual('M50,20Q50,318 20,258');
		});
		it('will not update if the shapes have not moved', function () {
			underTest.updateConnector();
			underTest.find('path').attr('d', '');

			underTest.updateConnector();
			expect(underTest.find('path').attr('d')).toBe('');
		});
		it('will update if the shapes move', function () {
			underTest.updateConnector();
			underTest.find('path').attr('d', '');
			fromNode.css('top', '50px');

			underTest.updateConnector();
			expect(underTest.find('path').attr('d')).toBe('M50,20Q50,252 130,192');
		});

	});
	it('does not die if one of the shapes is no longer present', function () {
		fromNode.remove();
		underTest.updateConnector();
	});
	it('does not die if nodeFrom gets cleared out', function () {
		underTest.data('nodeFrom', false);
		underTest.updateLink();
		expect(underTest.is(':visible')).toBeFalsy();
	});
	it('does not die if nodeTo gets cleared out', function () {
		underTest.data('nodeTo', false);
		underTest.updateLink();
		expect(underTest.is(':visible')).toBeFalsy();
	});
	afterEach(function () {
		fromNode.remove();
		toNode.remove();
		underTest.remove();
		third.remove();
		anotherConnector.remove();
	});
});
describe('updateLink', function () {
	'use strict';
	var underTest, fromNode, toNode, third, anotherLink;
	beforeEach(function () {
		fromNode = jQuery('<div>').attr('id', 'node_fr').css({ position: 'absolute', top: '100px', left: '200px', width: '100px', height: '40px'}).appendTo('body');
		toNode = jQuery('<div>').attr('id', 'node_to').css({ position: 'absolute', top: '220px', left: '330px', width: '12px', height: '44px'}).appendTo('body');
		underTest = MAPJS.createSVG().appendTo('body').attr('data-role', 'test-link').css('position', 'absolute').data({'nodeFrom': fromNode, 'nodeTo': toNode});
		third = jQuery('<div>').attr('id', 'node_third').css({ position: 'absolute', top: '330px', left: '220px', width: '119px', height: '55px'}).appendTo('body');
		anotherLink = MAPJS.createSVG().appendTo('body').attr('data-role', 'test-link').css('position', 'absolute').data({'nodeFrom': fromNode, 'nodeTo': third});
	});
	it('returns itself for chaining', function () {
		expect(underTest.updateLink()[0]).toEqual(underTest[0]);
	});
	it('draws a straight between the borders of two nodes', function () {
		underTest.updateLink();
		var path = underTest.find('path');
		expect(path.length).toBe(1);
		expect(path.attr('class')).toEqual('mapjs-link');
		expect(path.attr('d')).toEqual('M100,20L136,120');
	});
	it('positions the link to the upper left edge of the nodes, and expands it to the bottom right edge of the nodes', function () {
		underTest.updateLink();
		expect(underTest.css('top')).toEqual('100px');
		expect(underTest.css('left')).toEqual('200px');
		expect(underTest.css('height')).toEqual('164px');
		expect(underTest.css('width')).toEqual('142px');
	});
	it('uses the lineStyle data attribute to control the dashed styling', function () {
		underTest.data('lineStyle', 'dashed').updateLink();
		expect(underTest.find('path.mapjs-link').attr('stroke-dasharray')).toBe('8, 8');
	});
	it('clears the dashes if not provided in the lineStyle data attribute', function () {
		underTest.find('path').attr('stroke-dasharray', '1, 1');
		underTest.data('lineStyle', '').updateLink();
		expect(underTest.find('path.mapjs-link').attr('stroke-dasharray')).toBeFalsy();
	});
	it('uses the color attribute to set the line stroke', function () {
		/*jslint newcap:true*/
		underTest.data('color', 'blue').updateLink();
		// chrome and phantom return different forms for the same color, so explicit hex needed to make test repeatable
		expect(Color(underTest.find('path.mapjs-link').css('stroke')).hexString()).toBe('#0000FF');
	});

	it('updates the existing line if one is present', function () {
		var path = MAPJS.createSVG('path').attr('class', 'mapjs-link').appendTo(underTest);
		underTest.updateLink();
		expect(underTest.find('path.mapjs-link').length).toBe(1);
		expect(underTest.find('path.mapjs-link')[0]).toEqual(path[0]);
	});
	it('uses the arrow data attribute to draw an arrow', function () {
		underTest.data('arrow', 'true').updateLink();
		expect(underTest.find('path.mapjs-arrow').css('display')).toBe('inline');
	});
	it('updates an existing arrow if one is present', function () {
		var path = MAPJS.createSVG('path').attr('class', 'mapjs-arrow').appendTo(underTest);
		underTest.data('arrow', 'true').updateLink();
		expect(underTest.find('path.mapjs-arrow').length).toBe(1);
		expect(underTest.find('path.mapjs-arrow')[0]).toEqual(path[0]);
	});
	it('uses the color attribute to set the arrow fill', function () {
		/*jslint newcap:true*/
		underTest.data('arrow', 'true').data('color', '#FF7577').updateLink();
		// chrome and phantom return different forms for the same color, so explicit hex needed to make test repeatable
		expect(Color(underTest.find('path.mapjs-arrow').css('fill')).hexString()).toBe('#FF7577');
	});
	it('hides an existing arrow when the attribute is no longer present', function () {
		MAPJS.createSVG('path').attr('class', 'mapjs-arrow').appendTo(underTest);
		underTest.updateLink();
		expect(underTest.find('path.mapjs-arrow').css('display')).toBe('none');
	});

	it('updates multiple links at once', function () {
		jQuery('[data-role=test-link]').updateLink();
		expect(underTest.find('path').attr('d')).toEqual('M100,20L136,120');
		expect(anotherLink.find('path').attr('d')).toEqual('M50,40L80,230');
	});
	it('does not die if one of the shapes is no longer present', function () {
		fromNode.remove();
		underTest.updateLink();
	});
	it('does not die if nodeFrom gets cleared out', function () {
		underTest.data('nodeFrom', false);
		underTest.updateLink();
		expect(underTest.is(':visible')).toBeFalsy();
	});
	it('does not die if nodeTo gets cleared out', function () {
		underTest.data('nodeTo', false);
		underTest.updateLink();
		expect(underTest.is(':visible')).toBeFalsy();
	});
	describe('performance optimisations', function () {
		it('rounds coordinates', function () {
			anotherLink.data('arrow', 'true').updateLink();
			expect(anotherLink.find('path.mapjs-link').attr('d')).toEqual('M50,40L80,230');
			expect(anotherLink.find('path.mapjs-arrow').attr('d')).toEqual('M82,216L80,230L73,218Z');
		});
		it('will not update if the shapes have not moved and attributes have not changed', function () {
			underTest.updateLink();
			underTest.find('path').attr('d', '');

			underTest.updateLink();
			expect(underTest.find('path').attr('d')).toBe('');
		});
		it('will update if the shapes move', function () {
			underTest.updateLink();
			underTest.find('path').attr('d', '');
			fromNode.css('top', '50px');

			underTest.updateLink();
			expect(underTest.find('path').attr('d')).toBe('M100,20L136,170');
		});
		it('will update if the attributes change', function () {
			underTest.updateLink();
			underTest.find('path').attr('d', '');
			underTest.data('lineStyle', 'solid').updateLink();
			expect(underTest.find('path').attr('d')).toBe('M100,20L136,120');

		});
	});
	afterEach(function () {
		fromNode.remove();
		toNode.remove();
		underTest.remove();
		third.remove();
		anotherLink.remove();
	});

});
describe('updateNodeContent', function () {
	'use strict';
	var underTest, nodeContent, style,
		isHeadless = function () {
			return (navigator.userAgent.indexOf('PhantomJS')  !== -1);
		},
		checkNoStyle = function (element, style) {
			if (element.attr('style')) {
				if (_.isArray(style)) {
					_.each(style, function (aStyle) {
						checkNoStyle(element, aStyle);
					});
				} else {
					expect(element.attr('style').indexOf(style)).toBe(-1);
				}

			}

		};
	beforeEach(function () {
		style = jQuery('<style type="text/css"> .test-padding { padding: 5px;}  .test-max-width { max-width:160px; display: block }</style>').appendTo('head');
		underTest = jQuery('<span>').appendTo('body');
		nodeContent = {
			title: 'Hello World!',
			level: 3
		};
	});
	afterEach(function () {
		underTest.remove();
		style.remove();
	});
	it('returns itself to allow chaining', function () {
		expect(underTest.updateNodeContent(nodeContent)[0]).toEqual(underTest[0]);
	});
	describe('node text', function () {
		it('sets the node title as the DOM span text', function () {
			underTest.updateNodeContent(nodeContent);
			expect(underTest.find('[data-mapjs-role=title]').text()).toEqual(nodeContent.title);
		});
		it('reuses the existing span element if it already exists', function () {
			var existingSpan = jQuery('<span data-mapjs-role="title"></span>').appendTo(underTest);
			underTest.updateNodeContent(nodeContent);
			expect(existingSpan.text()).toEqual(nodeContent.title);
			expect(underTest.children().length).toBe(1);
		});
		it('should not allow text to overflow when there are long words', function () {
			var textBox = jQuery('<span data-mapjs-role="title" class="test-max-width"></span>').appendTo(underTest);
			nodeContent.title = 'first shouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshouldshould last';
			underTest.updateNodeContent(nodeContent);

			expect(parseInt(textBox.css('max-width'), 10)).toBeGreaterThan(160);
		});
		it('should not allow the box to shrink width if it is multiline', function () {
			var textBox = jQuery('<span data-mapjs-role="title" class="test-max-width"></span>').appendTo(underTest).css('width', '100px');
			nodeContent.title = 'first should could would maybe not so much and so on go on';
			underTest.updateNodeContent(nodeContent);
			expect(textBox.css('min-width')).toBe('160px');
		});
		it('should not force expand narrow multi-line text', function () {
			var textBox = jQuery('<span data-mapjs-role="title" class="test-max-width"></span>').appendTo(underTest).css('width', '100px');
			nodeContent.title = 'f\ns\nc';
			underTest.updateNodeContent(nodeContent);
			checkNoStyle(textBox, 'min-width');
		});

	});
	describe('setting the level', function () {
		it('sets the level attribute to the node content level', function () {
			underTest.updateNodeContent(nodeContent);
			expect(underTest.attr('mapjs-level')).toBe('3');
		});
	});
	describe('background', function () {
		it('uses the style from the background if specified', function () {
			nodeContent.attr = {
				style: {
					background: 'rgb(103, 101, 119)'
				}
			};
			underTest.updateNodeContent(nodeContent);
			expect(underTest.css('background-color')).toBe('rgb(103, 101, 119)');
		});
		it('sets the mapjs-node-dark class if the tinted background luminosity is < 0.5', function () {
			nodeContent.attr = { style: { background: 'rgb(3, 3, 3)' } };
			underTest.updateNodeContent(nodeContent);
			expect(underTest.hasClass('mapjs-node-dark')).toBeTruthy();

		});
		it('sets the mapjs-node-light class if the tinted background luminosity is 0.5< <0.9', function () {
			nodeContent.attr = { style: { background: 'rgb(0, 255, 0)' } };
			underTest.updateNodeContent(nodeContent);
			expect(underTest.hasClass('mapjs-node-light')).toBeTruthy();

		});
		it('sets the mapjs-node-white class if the tinted background luminosity is >0.9', function () {
			nodeContent.attr = { style: { background: 'rgb(255, 255, 255)' } };
			underTest.updateNodeContent(nodeContent);
			expect(underTest.hasClass('mapjs-node-white')).toBeTruthy();

		});
		it('clears background color and mapjs-node-* styles from the style if not specified', function () {
			underTest.css('background-color', 'blue').addClass('mapjs-node-dark mapjs-node-white mapjs-node-light');
			underTest.updateNodeContent(nodeContent);
			checkNoStyle(underTest, 'background-color');
			_.each(['mapsj-node-dark', 'mapjs-node-white', 'mapjs-node-light'], function (cls) {
				expect(underTest.hasClass(cls)).toBeFalsy();
			});
		});
		describe('handles weird background clearance - some browsers put in crap', function () {
			_.each([false, 'false', '', 'transparent'], function (weirdBgStyle) {
				it('deals with ' + weirdBgStyle + ' by clearing the background', function () {
					nodeContent.attr = {
						style: {
							background: weirdBgStyle
						}
					};
					underTest.updateNodeContent(nodeContent);
					checkNoStyle(underTest, 'background-color');
				});
			});
		});
	});
	describe('icon handling', function () {
		var textBox;
		beforeEach(function () {
			textBox = jQuery('<span data-mapjs-role="title" class="test-max-width"></span>').appendTo(underTest);
		});
		describe('when icon is set', function () {
			beforeEach(function () {
				nodeContent.attr = {
					icon: {
						url: 'http://iconurl/',
						width: 400,
						height: 500,
						position: 'center'
					}
				};
				nodeContent.title = 'AAAA';

				underTest.addClass('test-padding');
			});
			it('sets the generic background properties to the image which does not repeat', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.css('background-image')).toBe('url(http://iconurl/)');
				expect(underTest.css('background-repeat')).toBe('no-repeat');
				expect(underTest.css('background-size')).toBe('400px 500px');
			});
			it('positions center icons behind text and expands the node if needed to fit the image', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.css('background-position')).toBe('50% 50%');
				expect(underTest.css('min-width')).toEqual('400px');
				expect(underTest.css('min-height')).toEqual('500px');
				expect(textBox.css('margin-top')).toBe('241px');
			});
			it('positions center icons behind text and does not expand the node if not needed', function () {
				nodeContent.attr.icon.width = 5;
				nodeContent.attr.icon.height = 5;
				underTest.updateNodeContent(nodeContent);
				expect(underTest.css('background-position')).toBe('50% 50%');
				expect(underTest.css('min-width')).toBe('5px');
				checkNoStyle(underTest, 'min-height');
				checkNoStyle(textBox, 'margin-top');
			});
			it('positions left icons left of node text and vertically centers the text', function () {
				nodeContent.attr.icon.position = 'left';
				underTest.updateNodeContent(nodeContent);
				if (!isHeadless()) {
					expect(underTest.css('background-position')).toBe('left 5px top 50%');
				}

				expect(underTest.css('padding-left')).toEqual('410px');
				expect(textBox.css('margin-top')).toBe('241px');
			});
			it('positions right icons right of node text and vertically centers the text', function () {
				nodeContent.attr.icon.position = 'right';
				underTest.updateNodeContent(nodeContent);

				if (!isHeadless()) {
					expect(underTest.css('background-position')).toBe('right 5px top 50%');
				}

				expect(underTest.css('padding-right')).toEqual('410px');
				expect(textBox.css('margin-top')).toBe('241px');
			});
			it('positions top icons top of node text and horizontally centers the text', function () {
				nodeContent.attr.icon.position = 'top';
				underTest.updateNodeContent(nodeContent);

				if (!isHeadless()) {
					expect(underTest.css('background-position')).toBe('left 50% top 5px');
				}
				expect(underTest.css('padding-top')).toEqual('510px');
				expect(underTest.css('min-width')).toEqual('400px');
				expect(textBox.css('margin-left')).toBe('120px');
			});
			it('positions bottom icons bottom of node text and horizontally centers the text', function () {
				nodeContent.attr.icon.position = 'bottom';
				underTest.updateNodeContent(nodeContent);

				if (!isHeadless()) {
					expect(underTest.css('background-position')).toBe('left 50% bottom 5px');
				}
				expect(underTest.css('padding-bottom')).toEqual('510px');
				expect(underTest.css('min-width')).toEqual('400px');
				expect(textBox.css('margin-left')).toBe('120px');
			});

		});
		it('removes background image settings and narrows the node if no icon set', function () {
			underTest.css({
					'min-height': '200px',
					'min-width': '20px',
					'background-image': 'url(http://iconurl/)',
					'background-repeat': 'no-repeat',
					'background-size': '20px 20px',
					'background-position': 'center center',
					'padding': '10px 20px 30px 40px'
				});
			textBox.css('margin-top', '20px');
			underTest.updateNodeContent(nodeContent);
			checkNoStyle(underTest, ['background', 'padding', 'min-']);
			checkNoStyle(textBox, 'margin-top');

		});
	});
	describe('collapsed', function () {
		it('adds a collapsed class when collapsed', function () {
			nodeContent.attr = {collapsed: true};
			underTest.updateNodeContent(nodeContent);
			expect(underTest.hasClass('mapjs-collapsed')).toBeTruthy();
		});
		it('removes the collapsed class when uncollapsed', function () {
			underTest.addClass('mapjs-collapsed');
			underTest.updateNodeContent(nodeContent);
			expect(underTest.hasClass('mapjs-collapsed')).toBeFalsy();
		});
	});
	describe('hyperlink handling', function () {
		var textBox;
		beforeEach(function () {
			textBox = jQuery('<span data-mapjs-role="title"></span>').appendTo(underTest);
		});

		_.each([
				['removes the first link from text', 'google http://www.google.com', 'google'],
				['does not touch text without hyperlinks', 'google', 'google'],
				['removes only the first link', 'http://xkcd.com google http://www.google.com', 'google http://www.google.com'],
				['keeps link if there is no other text', 'http://xkcd.com', 'http://xkcd.com'],
				['truncates the link if it is too long and appends ...', 'http://google.com/search?q=onlylink', 'http://google.com/search?...']
			], function (testArgs) {
				it(testArgs[0], function () {
					nodeContent.title = testArgs[1];
					underTest.updateNodeContent(nodeContent);
					expect(textBox.text()).toEqual(testArgs[2]);
				});
			});
		describe('when there is a link', function () {
			beforeEach(function () {
				nodeContent.title = 'google http://www.google.com';
			});
			it('shows the link element', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-link').is(':visible')).toBeTruthy();
			});
			it('sets the href with a blank target on the link element to the hyperlink in node', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-link').attr('href')).toEqual('http://www.google.com');
				expect(underTest.find('a.mapjs-link').attr('target')).toEqual('_blank');
			});
			it('should reuse and show existing element', function () {
				jQuery('<a href="#" class="mapjs-link"></a>').appendTo(underTest).hide();
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-link').length).toBe(1);
				expect(underTest.find('a.mapjs-link').is(':visible')).toBeTruthy();
			});
		});
		describe('when there is no link', function () {
			it('hides the link element', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-link').is(':visible')).toBeFalsy();
			});
		});
	});
	describe('attachment handling', function () {
		describe('when there is an attachment', function () {
			beforeEach(function () {
				nodeContent.attr = {
					'attachment': {
						'contentType': 'text/html',
						'content': 'aa'
					}
				};
			});
			it('shows the paperclip element', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-attachment').is(':visible')).toBeTruthy();
			});
			it('binds the paperclip click to dispatch a mapModel event (which one?)', function () {
				var listener = jasmine.createSpy('listener');
				underTest.on('attachment-click', listener);
				underTest.updateNodeContent(nodeContent);
				underTest.find('a.mapjs-attachment').click();
				expect(listener).toHaveBeenCalled();
			});
			it('should reuse and show existing element', function () {
				jQuery('<a href="#" class="mapjs-attachment">hello</a>').appendTo(underTest).hide();
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-attachment').length).toBe(1);
				expect(underTest.find('a.mapjs-attachment').is(':visible')).toBeTruthy();
			});
		});
		describe('when there is no attachment', function () {
			it('hides the paperclip element', function () {
				underTest.updateNodeContent(nodeContent);
				expect(underTest.find('a.mapjs-attachment').is(':visible')).toBeFalsy();
			});
		});

	});
});
describe('MAPJS.DOMRender', function () {
	'use strict';
	describe('nodeCacheMark', function () {

		describe('returns the same value for two nodes if they have the same title, icon sizes and positions, and collapsed attribute', [
				['no icons, just titles', {title: 'zeka', x: 1, attr: {ignored: 1}}, {title: 'zeka', x: 2, attr: {ignored: 2}}],
				['titles and collapsed', {title: 'zeka', x: 1, attr: {ignored: 1, collapsed: true}}, {title: 'zeka', x: 2, attr: {ignored: 2, collapsed: true}}],
				['titles and icon', {title: 'zeka', x: 1, attr: { ignored: 1, icon: {width: 100, height: 120, position: 'top', url: '1'} }}, {title: 'zeka', x: 2, attr: {ignored: 2, icon: {width: 100, height: 120, position: 'top', url: '2'}}}]
			], function (first, second) {
				expect(MAPJS.DOMRender.nodeCacheMark(first)).toEqual(MAPJS.DOMRender.nodeCacheMark(second));
			});
		describe('returns different values for two nodes if they differ in the', [
				['titles', {title: 'zeka'}, {title: 'zeka2'}],
				['collapsed', {title: 'zeka', attr: {collapsed: true}}, {title: 'zeka', attr: {collapsed: false}}],
				['icon width', {title: 'zeka', attr: { icon: {width: 100, height: 120, position: 'top'} }}, {title: 'zeka', attr: { icon: {width: 101, height: 120, position: 'top'}}}],
				['icon height', {title: 'zeka', attr: { icon: {width: 100, height: 120, position: 'top'} }}, {title: 'zeka', attr: { icon: {width: 100, height: 121, position: 'top'}}}],
				['icon position', {title: 'zeka', attr: { icon: {width: 100, height: 120, position: 'left'} }}, {title: 'zeka', attr: {icon: {width: 100, height: 120, position: 'top'}}}]
			], function (first, second) {
				expect(MAPJS.DOMRender.nodeCacheMark(first)).not.toEqual(MAPJS.DOMRender.nodeCacheMark(second));
			});
	});
	describe('dimensionProvider', function () {
		var newElement, oldUpdateNodeContent, idea;
		beforeEach(function () {
			oldUpdateNodeContent = jQuery.fn.updateNodeContent;
			idea = {id: 1, title: 'zeka'};
		});
		afterEach(function () {
			if (newElement) {
				newElement.remove();
			}
			jQuery.fn.updateNodeContent = oldUpdateNodeContent;
		});
		it('calculates the width and height of node by drawing an invisible box with .mapjs-node and detaching it after', function () {
			newElement = jQuery('<style type="text/css">.mapjs-node { width:456px !important; min-height:789px !important}</style>').appendTo('body');
			expect(MAPJS.DOMRender.dimensionProvider(idea)).toEqual({width: 456, height: 789});
			expect(jQuery('.mapjs-node').length).toBe(0);
		});
		it('applies the updateNodeContent function while calculating dimensions', function () {
			jQuery.fn.updateNodeContent = function () {
				this.css('width', '654px');
				this.css('height', '786px');
				return this;
			};
			expect(MAPJS.DOMRender.dimensionProvider(idea)).toEqual({width: 654, height: 786});
		});
		describe('caching', function () {
			beforeEach(function () {
				jQuery.fn.updateNodeContent = jasmine.createSpy();
				jQuery.fn.updateNodeContent.and.callFake(function () {
					this.css('width', '654px');
					this.css('height', '786px');
					return this;
				});
			});
			it('looks up a DOM object with the matching node ID and if the node cache mark matches, returns the DOM width without re-applying content', function () {
				newElement = jQuery('<div>').data({width: 111, height: 222}).attr('id', 'node_1').appendTo('body');
				MAPJS.DOMRender.addNodeCacheMark(newElement, idea);
				expect(MAPJS.DOMRender.dimensionProvider(idea)).toEqual({width: 111, height: 222});
				expect(jQuery.fn.updateNodeContent).not.toHaveBeenCalled();
			});
			it('ignores DOM objects where the cache mark does not match', function () {
				newElement = jQuery('<div>').data({width: 111, height: 222}).attr('id', 'node_1').appendTo('body');
				MAPJS.DOMRender.addNodeCacheMark(newElement, idea);
				expect(MAPJS.DOMRender.dimensionProvider(_.extend(idea, {title: 'not zeka'}))).toEqual({width: 654, height: 786});
				expect(jQuery.fn.updateNodeContent).toHaveBeenCalled();

			});
		});
	});
	describe('viewController', function () {
		var stage,
			viewPort,
			mapModel;
		beforeEach(function () {
			mapModel = observable(jasmine.createSpyObj('mapModel', ['clickNode', 'openAttachment', 'toggleCollapse', 'editNode', 'getEditingEnabled', 'editNode']));
			viewPort = jQuery('<div>').appendTo('body');
			stage = jQuery('<div>').css('overflow', 'scroll').appendTo(viewPort);
			MAPJS.DOMRender.viewController(mapModel, stage);
			spyOn(jQuery.fn, 'queueFadeIn').and.callThrough();
		});
		afterEach(function () {
			viewPort.remove();
		});
		describe('nodeCreated', function () {
			describe('adds a DIV for the node to the stage', function () {
				var underTest, node;
				beforeEach(function () {
					node = {id: '11.12', title: 'zeka', x: 10, y: 20, width: 30, height: 40};
					spyOn(jQuery.fn, 'updateNodeContent').and.callFake(function () {
						this.css('height', 40);
						this.css('width', 30);
						return this;
					});
					stage.data('offsetX', 200);
					stage.data('offsetY', 100);
					stage.data('scale', 3);

					mapModel.dispatchEvent('nodeCreated', node);
					underTest = stage.children().first();
				});
				it('sanitises the ID by replacing dots with underscores', function () {
					expect(underTest.attr('id')).toBe('node_11_12');
				});
				it('makes the node focusable by adding a tabindex', function () {
					expect(underTest.attr('tabIndex')).toBe('0');
				});
				it('assigns the node role', function () {
					expect(underTest.attr('data-mapjs-role')).toBe('node');
				});
				it('adds an absolute position so it can move and have width', function () {
					expect(underTest.css('display')).toBe('block');
					expect(underTest.css('position')).toBe('absolute');
				});
				it('sets the x, y, width, height properties according to node values', function () {
					expect(underTest.data('x')).toBe(10);
					expect(underTest.data('y')).toBe(20);
					expect(underTest.data('width')).toBe(30);
					expect(underTest.data('height')).toBe(40);
				});
				it('assigns a mapjs-node css class', function () {
					expect(underTest.hasClass('mapjs-node')).toBeTruthy();
				});
				it('updates the node content', function () {
					expect(jQuery.fn.updateNodeContent).toHaveBeenCalledWith(node);
					expect(jQuery.fn.updateNodeContent).toHaveBeenCalledOnJQueryObject(underTest);
					expect(jQuery.fn.updateNodeContent.calls.count()).toBe(1);
				});
				it('schedules a fade-in animation', function () {
					expect(jQuery.fn.queueFadeIn).toHaveBeenCalledOnJQueryObject(underTest);
				});
				it('connects the node tap event to mapModel clickNode', function () {
					var event = jQuery.Event('tap');
					underTest.trigger(event);
					expect(mapModel.clickNode).toHaveBeenCalledWith('11.12', event);
				});
				it('connects the node double-tap event to toggleCollapse if editing is disabled', function () {
					mapModel.getEditingEnabled.and.returnValue(false);
					underTest.trigger('doubletap');
					expect(mapModel.toggleCollapse).toHaveBeenCalledWith('mouse');
					expect(mapModel.editNode).not.toHaveBeenCalled();
				});
				it('connects the node double-tap event to node editing if editing is enabled', function () {
					mapModel.getEditingEnabled.and.returnValue(true);
					underTest.trigger('doubletap');
					expect(mapModel.toggleCollapse).not.toHaveBeenCalled();
					expect(mapModel.editNode).toHaveBeenCalledWith('mouse');
				});
				it('connects attachment-click with openAttachment even when editing is disabled', function () {
					mapModel.getEditingEnabled.and.returnValue(false);
					underTest.trigger('attachment-click');
					expect(mapModel.openAttachment).toHaveBeenCalledWith('mouse', '11.12');
				});
				it('fixes the width of the node so it does not condense on movements', function () {
					expect(underTest.css('min-width')).toBe('30px');
				});
				it('tags the node with a cache mark', function () {
					expect(underTest.data('nodeCacheMark')).toEqual({ title : 'zeka', icon : undefined, collapsed : undefined });
				});
				it('sets the screen coordinates according to data attributes, ignoring stage zoom and transformations', function () {
					expect(underTest.css('top')).toBe('20px');
					expect(underTest.css('left')).toBe('10px');
				});
			});
			describe('grows the stage if needed to fit in', function () {
				beforeEach(function () {
					stage.data({offsetX: 200, offsetY: 100, width: 300, height: 150});
					spyOn(jQuery.fn, 'updateStage').and.callThrough();
				});

				it('grows the stage from the top if y would be negative', function () {
					mapModel.dispatchEvent('nodeCreated', {x: 20, y: -120, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('offsetY')).toBe(120);
					expect(stage.data('height')).toBe(170);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('grows the stage from the left if x would be negative', function () {
					mapModel.dispatchEvent('nodeCreated', {x: -230, y: 20, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('offsetX')).toBe(230);
					expect(stage.data('width')).toBe(330);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('expands the stage min width without touching the offset if the total width would be over the current boundary', function () {
					mapModel.dispatchEvent('nodeCreated', {x: 80, y: 20, width: 40, height: 10, title: 'zeka', id: 1});
					expect(stage.data('width')).toBe(320);
					expect(stage.data('offsetX')).toBe(200);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('expands the stage min height without touching the offset if the total height would be over the current boundary', function () {
					mapModel.dispatchEvent('nodeCreated', {x: 80, y: 20, width: 40, height: 60, title: 'zeka', id: 1});
					expect(stage.data('height')).toBe(180);
					expect(stage.data('offsetY')).toBe(100);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('does not expand the stage or call updateStage if the node would fit into current bounds', function () {
					mapModel.dispatchEvent('nodeCreated', {x: -10, y: -10, width: 20, height: 20, title: 'zeka', id: 1});
					expect(stage.data('width')).toBe(300);
					expect(stage.data('height')).toBe(150);
					expect(stage.data('offsetX')).toBe(200);
					expect(stage.data('offsetY')).toBe(100);
					expect(jQuery.fn.updateStage).not.toHaveBeenCalled();
				});
			});
		});
		describe('nodeSelectionChanged', function () {
			var underTest;
			beforeEach(function () {
				var node = {id: '11.12', title: 'zeka', x: -80, y: -35, width: 30, height: 20};
				spyOn(jQuery.fn, 'updateNodeContent').and.callFake(function () {
					this.css('height', 40);
					this.css('width', 30);
					return this;
				});
				viewPort.css({'width': '200', 'height': '100', 'overflow': 'scroll'});
				stage.data({
					'offsetX': 100,
					'offsetY': 50,
					'scale': 2,
					'width': 500,
					'height': 500
				});
				stage.updateStage();
				viewPort.scrollLeft(180);
				viewPort.scrollTop(80);

				mapModel.dispatchEvent('nodeCreated', node);
				underTest = stage.children().first();
				spyOn(jQuery.fn, 'focus').and.callThrough();
				spyOn(jQuery.fn, 'animate');
			});
			describe('when deselected', function () {
				beforeEach(function () {
					underTest.addClass('selected');
					mapModel.dispatchEvent('nodeSelectionChanged', '11.12', false);
				});
				it('removes the selected class', function () {
					expect(underTest.hasClass('selected')).toBeFalsy();
				});
				it('does not move the viewport', function () {
					expect(viewPort.scrollLeft()).toBe(180);
					expect(viewPort.scrollTop()).toBe(80);
				});
				it('does not request focus or animate', function () {
					expect(jQuery.fn.focus).not.toHaveBeenCalled();
					expect(jQuery.fn.animate).not.toHaveBeenCalled();
				});
			});
			describe('when selected', function () {
				describe('when node is visible', function () {
					beforeEach(function ()  {
						viewPort.scrollLeft(5);
						viewPort.scrollTop(3);
						mapModel.dispatchEvent('nodeSelectionChanged', '11.12', true);
					});
					it('adds the selected class immediately', function () {
						expect(underTest.hasClass('selected')).toBeTruthy();
					});
					it('requests focus for the node immediately', function () {
						expect(jQuery.fn.focus.calls.count()).toBe(1);
						expect(jQuery.fn.focus).toHaveBeenCalledOnJQueryObject(underTest);
					});
					it('does not animate', function () {
						expect(jQuery.fn.animate).not.toHaveBeenCalled();
					});
				});

				_.each([
					['left', -80, 0, {scrollLeft: 30}],
					['top', 0, -20, {scrollTop: 50}],
					['left', -80, 0, {scrollLeft: 30}],
					['top left', -80, -20, {scrollLeft: 30, scrollTop: 50}],
					['right', 90, 0, {scrollLeft: 250}],
					['bottom', 0, 80, {scrollTop: 210}],
					['bottom right', 90, 80, {scrollTop: 210, scrollLeft: 250}]
				], function (testArgs) {
					var caseName = testArgs[0],
						nodeX = testArgs[1],
						nodeY = testArgs[2],
						expectedAnimation = testArgs[3];
					describe('when ' + caseName + ' of viewport', function () {
						beforeEach(function ()  {
							underTest.data('x', nodeX);
							underTest.data('y', nodeY);
							mapModel.dispatchEvent('nodeSelectionChanged', '11.12', true);
						});
						it('does not immediately adds the selected class or focus', function () {
							expect(underTest.hasClass('selected')).toBeFalsy();
							expect(jQuery.fn.focus).not.toHaveBeenCalled();
						});
						it('animates scroll movements to show selected node', function () {
							expect(jQuery.fn.animate).toHaveBeenCalledOnJQueryObject(viewPort);
							expect(jQuery.fn.animate.calls.first().args[0]).toEqual(expectedAnimation);
						});
						it('sets the selected class and asks for focus once the animation completes', function () {
							jQuery.fn.animate.calls.first().args[1].complete();
							expect(underTest.hasClass('selected')).toBeTruthy();
							expect(jQuery.fn.focus).toHaveBeenCalledOnJQueryObject(underTest);
						});
					});
				});
			});
		});
		describe('nodeRemoved', function () {
			var underTest, node;
			beforeEach(function () {
				node = {id: '11', title: 'zeka', x: -80, y: -35, width: 30, height: 20};
				mapModel.dispatchEvent('nodeCreated', node);
				underTest = stage.children().first();
				spyOn(jQuery.fn, 'queueFadeOut');
			});
			it('animates a fade-out', function () {
				mapModel.dispatchEvent('nodeRemoved', node);
				expect(jQuery.fn.queueFadeOut).toHaveBeenCalledOnJQueryObject(underTest);
			});
		});
		describe('nodeMoved', function () {
			var underTest, node;
			beforeEach(function () {
				node = {id: 1, title: 'zeka', x: 0, y: 0, width: 20, height: 10};
				stage.data({offsetX: 200, offsetY: 100, width: 300, height: 150});
				mapModel.dispatchEvent('nodeCreated', node);
				underTest = stage.children().first();

				spyOn(jQuery.fn, 'updateStage').and.callThrough();
			});
			it('sets the new data coordinates', function () {
				mapModel.dispatchEvent('nodeMoved', {x: 20, y: -120, width: 20, height: 10, title: 'zeka', id: 1});
				expect(underTest.data('x')).toBe(20);
				expect(underTest.data('y')).toBe(-120);
			});
			describe('expands the stage if needed', function () {
				it('grows the stage from the top if y would be negative', function () {
					mapModel.dispatchEvent('nodeMoved', {x: 20, y: -120, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('offsetY')).toBe(120);
					expect(stage.data('height')).toBe(170);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('grows the stage from the left if x would be negative', function () {
					mapModel.dispatchEvent('nodeMoved', {x: -230, y: 20, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('offsetX')).toBe(230);
					expect(stage.data('width')).toBe(330);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('expands the stage min width without touching the offset if the total width would be over the current boundary', function () {
					mapModel.dispatchEvent('nodeMoved', {x: 90, y: 20, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('width')).toBe(310);
					expect(stage.data('offsetX')).toBe(200);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('expands the stage min height without touching the offset if the total height would be over the current boundary', function () {
					mapModel.dispatchEvent('nodeMoved', {x: 20, y: 45, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('height')).toBe(155);
					expect(stage.data('offsetY')).toBe(100);
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
				});
				it('does not expand the stage or call updateStage if the node would fit into current bounds', function () {
					mapModel.dispatchEvent('nodeMoved', {x: -10, y: -10, width: 20, height: 10, title: 'zeka', id: 1});
					expect(stage.data('width')).toBe(300);
					expect(stage.data('height')).toBe(150);
					expect(stage.data('offsetX')).toBe(200);
					expect(stage.data('offsetY')).toBe(100);
					expect(jQuery.fn.updateStage).not.toHaveBeenCalled();
				});
			});

			describe('viewport interactions', function () {
				var moveListener, animateMoveListener;
				beforeEach(function () {
					viewPort.css({'width': '200', 'height': '100', 'overflow': 'scroll'});
					stage.data({ 'offsetX': 100, 'offsetY': 50, 'scale': 2, 'width': 500, 'height': 500 });
					stage.updateStage();
					viewPort.scrollLeft(180);
					viewPort.scrollTop(80);
					moveListener = jasmine.createSpy('mapjs:move');
					animateMoveListener = jasmine.createSpy('mapjs:animatemove');
					underTest.on('mapjs:move', moveListener).on('mapjs:animatemove', animateMoveListener);
					spyOn(jQuery.fn, 'animate').and.returnValue(underTest);
				});
				_.each([
						['on left edge of', -20, 10],
						['on right edge of', 80, 10],
						['on top edge of', 20, -15],
						['on bottom edge of', 20, 35],
						['inside', 20, 10]
					],
					function (testArgs) {
						var caseName = testArgs[0], nodeX = testArgs[1], nodeY = testArgs[2];
						describe('when ' + caseName + ' viewport', function () {
							beforeEach(function () {
								mapModel.dispatchEvent('nodeMoved', {x: nodeX, y: nodeY, width: 20, height: 10, id: 1});
							});
							it('does not update screen coordinates immediately', function () {
								expect(underTest.css('left')).toBe('0px');
								expect(underTest.css('top')).toBe('0px');
							});
							it('does not fire the moved event immediately', function () {
								expect(moveListener).not.toHaveBeenCalled();
							});
							it('fires the moveanimate event', function () {
								expect(animateMoveListener).toHaveBeenCalled();
							});
							it('schedules an animation to move the coordinates', function () {
								expect(jQuery.fn.animate).toHaveBeenCalledOnJQueryObject(underTest);
								expect(jQuery.fn.animate.calls.first().args[0]).toEqual({left: nodeX, top: nodeY, opacity: 1});
							});
							it('fires the move event after the animation completes', function () {
								jQuery.fn.animate.calls.first().args[1].complete();
								expect(underTest.css('left')).toBe(nodeX + 'px');
								expect(underTest.css('top')).toBe(nodeY + 'px');
								expect(moveListener).toHaveBeenCalled();
							});

						});
					});
				_.each([
						['above', 20, -30],
						['below', 20, 45],
						['left of', -35, 10],
						['right of', 95, 10]
					], function (testArgs) {
						var caseName = testArgs[0], nodeX = testArgs[1], nodeY = testArgs[2];
						describe('when ' + caseName + ' viewport', function () {
							beforeEach(function () {
								mapModel.dispatchEvent('nodeMoved', {x: nodeX, y: nodeY, width: 20, height: 10, id: 1});
							});
							it('updates screen coordinates immediately', function () {
								expect(underTest.css('left')).toBe(nodeX + 'px');
								expect(underTest.css('top')).toBe(nodeY + 'px');
							});
							it('fires the moved event immediately', function () {
								expect(moveListener).toHaveBeenCalled();
							});
							it('does not fire the moveanimate event', function () {
								expect(animateMoveListener).not.toHaveBeenCalled();
							});
							it('does not schedule an animation', function () {
								expect(jQuery.fn.animate).not.toHaveBeenCalled();
							});
						});
					});
			});
		});
		_.each(['nodeTitleChanged', 'nodeAttrChanged'], function (eventType) {
			it('updates node content on ' + eventType, function () {
				var underTest, node;
				node = {id: '11', title: 'zeka', x: -80, y: -35, width: 30, height: 20};
				mapModel.dispatchEvent('nodeCreated', node);
				underTest = stage.children().first();
				spyOn(jQuery.fn, 'updateNodeContent');

				mapModel.dispatchEvent(eventType, node);
				expect(jQuery.fn.updateNodeContent).toHaveBeenCalledOnJQueryObject(underTest);

			});
		});
		describe('connector events', function () {
			var nodeFrom, nodeTo, underTest, connector;
			beforeEach(function () {
				connector = {from: '1.from', to: '1.to'};
				mapModel.dispatchEvent('nodeCreated', {id: '1.from', title: 'zeka', x: -80, y: -35, width: 30, height: 20});
				mapModel.dispatchEvent('nodeCreated', {id: '1.to', title: 'zeka2', x: 80, y: 35, width: 50, height: 34});
				nodeFrom = jQuery('#node_1_from');
				nodeTo = jQuery('#node_1_to');
				spyOn(jQuery.fn, 'updateConnector').and.callThrough();
				jQuery.fn.queueFadeIn.calls.reset();

				mapModel.dispatchEvent('connectorCreated', connector);
				underTest = stage.children('[data-mapjs-role=connector]').first();

			});
			describe('connectorCreated', function () {
				it('adds a connector element to the stage', function () {
					expect(underTest.length).toBe(1);
					expect(underTest.parent()[0]).toEqual(stage[0]);
				});
				it('creates a SVG mapjs-draw-container class', function () {
					expect(underTest.prop('tagName')).toBe('svg');
					expect(underTest.attr('class')).toEqual('mapjs-draw-container');
				});
				it('assigns the DOM Id by sanitising node IDs', function () {
					expect(underTest.prop('id')).toBe('connector_1_from_1_to');
				});
				it('maps the from and to nodes as jQuery objects to data properties', function () {
					expect(underTest.data('nodeFrom')[0]).toEqual(nodeFrom[0]);
					expect(underTest.data('nodeTo')[0]).toEqual(nodeTo[0]);
				});
				it('queues connector fade in', function () {
					expect(jQuery.fn.queueFadeIn).toHaveBeenCalledWith({ duration : 400, queue : 'nodeQueue', easing : 'linear' });
					expect(jQuery.fn.queueFadeIn).toHaveBeenCalledOnJQueryObject(underTest);
				});
				it('updates the connector content', function () {
					expect(jQuery.fn.updateConnector).toHaveBeenCalledOnJQueryObject(underTest);
				});
				describe('event wiring for node updates', function () {
					beforeEach(function () {
						jQuery.fn.updateConnector.calls.reset();
						spyOn(jQuery.fn, 'animateConnectorToPosition');
					});
					_.each(['from', 'to'], function (node) {
						describe('moving node ' + node, function () {
							beforeEach(function () {
								jQuery('#node_1_' + node).trigger('mapjs:move');
							});
							it('updates connector', function () {
								expect(jQuery.fn.updateConnector).toHaveBeenCalledOnJQueryObject(underTest);
							});
							it('does not add connectors to animation list', function () {
								mapModel.dispatchEvent('layoutChangeComplete');
								expect(jQuery.fn.animateConnectorToPosition).not.toHaveBeenCalled();
							});
						});
						describe('animating node ' + node, function () {
							beforeEach(function () {
								jQuery('#node_1_' + node).trigger('mapjs:animatemove');
							});
							it('does not update the connector immediately', function () {
								expect(jQuery.fn.updateConnector).not.toHaveBeenCalled();
							});
							it('does not animate the connector immediately', function () {
								expect(jQuery.fn.animateConnectorToPosition).not.toHaveBeenCalled();
							});
							it('animates the connector after the layout change is complete', function () {
								mapModel.dispatchEvent('layoutChangeComplete');
								expect(jQuery.fn.animateConnectorToPosition).toHaveBeenCalledOnJQueryObject(underTest);
							});
							it('if a connector cannot simply be animated, updates with each animation progress tick', function () {
								jQuery.fn.animateConnectorToPosition.and.returnValue(false);
								jQuery.fn.updateConnector.calls.reset();

								spyOn(jQuery.fn, 'animate');
								mapModel.dispatchEvent('layoutChangeComplete');

								jQuery.fn.animate.calls.mostRecent().args[1].progress();
								expect(jQuery.fn.updateConnector).toHaveBeenCalledOnJQueryObject(underTest);

							});
						});
					});
				});
			});
			describe('connectorRemoved', function () {
				it('schedules a fade out animation', function () {
					spyOn(jQuery.fn, 'queueFadeOut');
					mapModel.dispatchEvent('connectorRemoved', connector);

					expect(jQuery.fn.queueFadeOut).toHaveBeenCalledWith({ duration : 400, queue : 'nodeQueue', easing : 'linear' });
					expect(jQuery.fn.queueFadeOut).toHaveBeenCalledOnJQueryObject(underTest);
				});
			});
		});


		describe('link events', function () {
			var nodeFrom, nodeTo, underTest, link;
			beforeEach(function () {
				link = {ideaIdFrom: '1.from', ideaIdTo: '1.to', attr: {style: {color: 'blue', lineStyle: 'solid', arrow: true}}};
				mapModel.dispatchEvent('nodeCreated', {id: '1.from', title: 'zeka', x: -80, y: -35, width: 30, height: 20});
				mapModel.dispatchEvent('nodeCreated', {id: '1.to', title: 'zeka2', x: 80, y: 35, width: 50, height: 34});
				nodeFrom = jQuery('#node_1_from');
				nodeTo = jQuery('#node_1_to');
				spyOn(jQuery.fn, 'updateLink').and.callThrough();
				jQuery.fn.queueFadeIn.calls.reset();

				mapModel.dispatchEvent('linkCreated', link);
				underTest = stage.children('[data-mapjs-role=link]').first();

			});
			describe('linkCreated', function () {
				it('adds a link element to the stage', function () {
					expect(underTest.length).toBe(1);
					expect(underTest.parent()[0]).toEqual(stage[0]);
				});
				it('creates a SVG mapjs-draw-container class', function () {
					expect(underTest.prop('tagName')).toBe('svg');
					expect(underTest.attr('class')).toEqual('mapjs-draw-container');
				});
				it('assigns the DOM Id by sanitising node IDs', function () {
					expect(underTest.prop('id')).toBe('link_1_from_1_to');
				});
				it('maps the from and to nodes as jQuery objects to data properties', function () {
					expect(underTest.data('nodeFrom')[0]).toEqual(nodeFrom[0]);
					expect(underTest.data('nodeTo')[0]).toEqual(nodeTo[0]);
				});
				it('queues link fade in', function () {
					expect(jQuery.fn.queueFadeIn).toHaveBeenCalledWith({ duration : 400, queue : 'nodeQueue', easing : 'linear' });
					expect(jQuery.fn.queueFadeIn).toHaveBeenCalledOnJQueryObject(underTest);
				});
				it('updates the link content', function () {
					expect(jQuery.fn.updateLink).toHaveBeenCalledOnJQueryObject(underTest);
				});
				it('passes the style properties as data attributes to the DOM object', function () {
					expect(underTest.data('lineStyle')).toBe('solid');
					expect(underTest.data('color')).toBe('blue');
					expect(underTest.data('arrow')).toBeTruthy();
				});
				describe('event wiring for node updates', function () {
					beforeEach(function () {
						jQuery.fn.updateLink.calls.reset();
						spyOn(jQuery.fn, 'animateConnectorToPosition');
					});
					_.each(['from', 'to'], function (node) {
						describe('moving node ' + node, function () {
							beforeEach(function () {
								jQuery('#node_1_' + node).trigger('mapjs:move');
							});
							it('updates link', function () {
								expect(jQuery.fn.updateLink).toHaveBeenCalledOnJQueryObject(underTest);
							});
							it('does not add links to animation list', function () {
								mapModel.dispatchEvent('layoutChangeComplete');
								expect(jQuery.fn.animateConnectorToPosition).not.toHaveBeenCalled();
							});
						});
						describe('animating node ' + node, function () {
							beforeEach(function () {
								jQuery('#node_1_' + node).trigger('mapjs:animatemove');
							});
							it('does not update the link immediately', function () {
								expect(jQuery.fn.updateLink).not.toHaveBeenCalled();
							});
							it('does not animate the link immediately', function () {
								expect(jQuery.fn.animateConnectorToPosition).not.toHaveBeenCalled();
							});
							it('animates the link after the layout change is complete', function () {
								mapModel.dispatchEvent('layoutChangeComplete');
								expect(jQuery.fn.animateConnectorToPosition).toHaveBeenCalledOnJQueryObject(underTest);
							});
							it('if a link cannot simply be animated, updates with each animation progress tick', function () {
								jQuery.fn.animateConnectorToPosition.and.returnValue(false);
								jQuery.fn.updateLink.calls.reset();

								spyOn(jQuery.fn, 'animate');
								mapModel.dispatchEvent('layoutChangeComplete');

								jQuery.fn.animate.calls.mostRecent().args[1].progress();
								expect(jQuery.fn.updateLink).toHaveBeenCalledOnJQueryObject(underTest);

							});
						});
					});
				});
			});
			describe('linkRemoved', function () {
				it('schedules a fade out animation', function () {
					spyOn(jQuery.fn, 'queueFadeOut');
					mapModel.dispatchEvent('linkRemoved', link);
					expect(jQuery.fn.queueFadeOut).toHaveBeenCalledWith({ duration : 400, queue : 'nodeQueue', easing : 'linear' });
					expect(jQuery.fn.queueFadeOut).toHaveBeenCalledOnJQueryObject(underTest);
				});
			});
		});
		describe('mapScaleChanged', function () {
			beforeEach(function () {
				spyOn(jQuery.fn, 'updateStage').and.callThrough();
				spyOn(jQuery.fn, 'animate');
				viewPort.css({'width': '200', 'height': '100', 'overflow': 'scroll'});
				stage.data({ 'offsetX': 100, 'offsetY': 50, 'scale': 1, 'width': 1000, 'height': 1000 });
				stage.updateStage();
				viewPort.scrollLeft(180);
				viewPort.scrollTop(80);

				stage.updateStage.calls.reset();
				mapModel.dispatchEvent('mapScaleChanged', 2);
			});
			it('updates stage data property and calls updateStage to set CSS transformations', function () {
				expect(stage.data('scale')).toBe(2);
				expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
			});
			it('applies scale factors successively', function () {
				mapModel.dispatchEvent('mapScaleChanged', 2.5);
				expect(stage.data('scale')).toBe(5);
			});
			it('keeps the center point in the same position in the new scale', function () {
				expect(viewPort.scrollLeft()).toBe(460);
				expect(viewPort.scrollTop()).toBe(210);
			});
			it('does not allow scaling by more than factor of 5', function () {
				mapModel.dispatchEvent('mapScaleChanged', 10);
				expect(stage.data('scale')).toBe(5);
			});
			it('does not allow scaling by a factor of less than 0.2', function () {
				mapModel.dispatchEvent('mapScaleChanged', 0.0001);
				expect(stage.data('scale')).toBe(0.2);
			});
		});
		describe('nodeFocusRequested', function () {
			beforeEach(function () {
				spyOn(jQuery.fn, 'updateStage').and.callThrough();
				spyOn(jQuery.fn, 'animate').and.callFake(function () { return this; });
				viewPort.css({'width': '200', 'height': '100', 'overflow': 'scroll'});
				stage.data({ 'offsetX': 100, 'offsetY': 50, 'scale': 1, 'width': 400, 'height': 300 });
				stage.updateStage();
				viewPort.scrollLeft(180);
				viewPort.scrollTop(80);
				mapModel.dispatchEvent('nodeCreated', {id: '11.12', title: 'zeka2', x: 100, y: 50, width: 20, height: 10});
				jQuery.fn.animate.calls.reset();
				jQuery.fn.updateStage.calls.reset();
			});
			it('resets stage scale', function () {
				stage.data({scale: 2}).updateStage();
				stage.updateStage.calls.reset();
				mapModel.dispatchEvent('nodeFocusRequested', '11.12');
				expect(stage.data('scale')).toBe(1);
				expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);
			});
			it('does not immediately change viewport', function () {
				mapModel.dispatchEvent('nodeFocusRequested', '11.12');
				expect(viewPort.scrollLeft()).toBe(180);
				expect(viewPort.scrollTop()).toBe(80);
			});
			it('schedules an animation for the viewport', function () {
				mapModel.dispatchEvent('nodeFocusRequested', '11.12');
				expect(jQuery.fn.animate.calls.count()).toBe(1);
				expect(jQuery.fn.animate).toHaveBeenCalledWith({scrollLeft: 110, scrollTop: 55}, {duration: 400});
				expect(jQuery.fn.animate).toHaveBeenCalledOnJQueryObject(viewPort);
			});
			it('does not expand the stage if not needed', function () {
				mapModel.dispatchEvent('nodeFocusRequested', '11.12');
				expect(stage.data()).toEqual({ 'offsetX': 100, 'offsetY': 50, 'scale': 1, 'width': 400, 'height': 300 });
				expect(jQuery.fn.updateStage).not.toHaveBeenCalled();
			});
			describe('expands the stage to enable scrolling to the node point when the node is ', [
					['left', -50, 50, 140, 50, 440, 300],
					['top', 100, -40, 100, 85, 400, 335 ],
					['right', 270, 50, 100, 50, 480, 300 ],
					['bottom', 100, 230, 100, 50, 400, 335 ]

				], function (nodeX, nodeY, expectedStageOffsetX, expectedStageOffsetY, expectedStageWidth, expectedStageHeight) {
					jQuery('#node_11_12').data({x: nodeX, y: nodeY});
					mapModel.dispatchEvent('nodeFocusRequested', '11.12');
					expect(jQuery.fn.updateStage).toHaveBeenCalledOnJQueryObject(stage);

					expect(stage.data('offsetX')).toEqual(expectedStageOffsetX);
					expect(stage.data('offsetY')).toEqual(expectedStageOffsetY);
					expect(stage.data('width')).toEqual(expectedStageWidth);
					expect(stage.data('height')).toEqual(expectedStageHeight);
				}
			);

		});
	});
});
