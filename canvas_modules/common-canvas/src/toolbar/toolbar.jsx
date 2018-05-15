/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

import React from "react";
import PropTypes from "prop-types";
import Tooltip from "../tooltip/tooltip.jsx";
import ObserveSize from "react-observe-size";
import Icon from "../icons/icon.jsx";
import { TOOLBAR } from "../common-canvas/constants/canvas-constants.js";
import constants from "../common-canvas/constants/canvas-constants";

// eslint override
/* global window document */
/* eslint max-depth: ["error", 5] */

class Toolbar extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			defaultToolbarWidth: TOOLBAR.ICON_WIDTH * 5, // Width of toolbar with palette, zoom, and notification icons
			maxToolbarWidth: 0, // Width of toolbar if displaying all icons and dividers
			dividerCount: 0,
			showExtendedMenu: false
		};

		this.generatePaletteIcon = this.generatePaletteIcon.bind(this);
		this.generateNotificationIcon = this.generateNotificationIcon.bind(this);
		this.toggleShowExtendedMenu = this.toggleShowExtendedMenu.bind(this);
		this.toolbarMenuActionHandler = this.toolbarMenuActionHandler.bind(this);
	}

	componentDidMount() {
		if (this.props.config) {
			this.calculateMaxToolbarWidth(this.props.config);
		}
	}

	getObjectWidth(classOrId) {
		const firstChar = classOrId.charAt(0);
		const remaining = classOrId.substring(1);
		if (typeof document !== "undefined") {
			const elem = (firstChar === "#") ? document.getElementById(remaining) : document.getElementsByClassName(remaining)[0];
			if (elem !== null) {
				return window.getComputedStyle(elem, null).getPropertyValue("width");
			}
		}
		return null;
	}

	// Need to set a className for notification bell icon in the DOM
	// to be used in notification-panel.jsx: handleNotificationPanelClickOutside()
	getActionClassName(action) {
		return action.indexOf(constants.NOTIFICATION_BELL_ICON.DEFAULT) > -1 ? "notificationBellIcon" : action;
	}

	getNotificationIconStateObject(isIconEnabled) {
		const notificationMessages = this.props.canvasController.getNotificationMessages();
		const errorMessages = this.props.canvasController.getNotificationMessages(constants.ERROR);
		const warningMessages = this.props.canvasController.getNotificationMessages(constants.WARNING);

		let className = "canvas-icon fill" + constants.NOTIFICATION_BELL_ICON.DEFAULT + " " + constants.INFORMATION;
		if (isIconEnabled) {
			const bellIconClassName = "canvas-icon fill " + constants.NOTIFICATION_BELL_ICON.DOT + " ";
			if (errorMessages.length > 0) {
				className = bellIconClassName + constants.ERROR;
			} else if (warningMessages.length > 0) {
				className = bellIconClassName + constants.WARNING;
			} else if (notificationMessages.length > 0) {
				className = bellIconClassName + constants.SUCCESS;
			}
		}
		return {
			icon: notificationMessages.length > 0 ? constants.NOTIFICATION_BELL_ICON.DOT : constants.NOTIFICATION_BELL_ICON.DEFAULT,
			className: className
		};
	}

	calculateMaxToolbarWidth(list) {
		let dividerCount = 0;
		let totalWidthSize = this.state.defaultToolbarWidth;
		for (let i = 0; i < list.length; i++) {
			if (list[i].action) {
				totalWidthSize += TOOLBAR.ICON_WIDTH;
			} else if (list[i].divider) {
				totalWidthSize += TOOLBAR.DIVIDER_WIDTH;
				dividerCount++;
			}
		}

		this.setState({
			dividerCount: dividerCount,
			maxToolbarWidth: totalWidthSize
		});
	}

	calculateDisplayItems(toolbarWidth) {
		const numObjects = this.props.config.length;
		if (this.state.maxToolbarWidth >= toolbarWidth) { // need to minimize
			const definition = this.props.config;
			let availableWidth = toolbarWidth - this.state.defaultToolbarWidth + TOOLBAR.ICON_WIDTH;

			if (availableWidth < TOOLBAR.ICON_WIDTH) {
				return 0;
			}

			let items = 0;
			for (let i = 0; i < definition.length; i++) {
				if (definition[i].action) {
					availableWidth -= TOOLBAR.ICON_WIDTH;
					items++;
				} else if (definition[i].divider) {
					availableWidth -= TOOLBAR.DIVIDER_WIDTH;
					items++;
				}

				if (availableWidth < TOOLBAR.ICON_WIDTH) {
					items--;
					break;
				}
			}
			return items;
		}
		return numObjects;
	}

	generateActionItems(definition, displayItems, actionsHandler, overflow) {
		const that = this;
		let utilityActions = [];
		let dividerClassName = "toolbar-divider";
		if (overflow) {
			dividerClassName = "overflow-toolbar-divider";
		}
		if (definition.length === displayItems ||
			(definition.length - 1 === displayItems && definition[displayItems].divider)) { // dont show overflow icon if last item is divider
			utilityActions = definition.map(function(actionObj, actionObjNum) {
				if (actionObj.action) {
					const actionId = actionObj.action + "-action";
					if (actionObj.action.startsWith("notification") || actionObj.action.startsWith(constants.NOTIFICATION_BELL_ICON.DEFAULT)) {
						return that.generateNotificationIcon(actionObj, actionId, overflow);
					} else if (actionObj.enable === true) {
						if (actionObj.action.startsWith("palette")) {
							return that.generatePaletteIcon(actionObj, overflow);
						}
						return that.generateEnabledActionIcon(actionObj, actionId, actionsHandler, overflow);
					}
					// disable
					return that.generateDisabledActionIcon(actionObj, actionId, overflow);
				}
				return (<div key={"toolbar-divider-" + actionObjNum} className={dividerClassName} />);
			});
		} else {
			for (let i = 0; i < displayItems; i++) {
				const actionObj = definition[i];
				if (actionObj.action) {
					const actionId = actionObj.action + "-action";
					if (actionObj.enable === true) {
						if (actionObj.action.startsWith("palette")) {
							utilityActions[i] = this.generatePaletteIcon(actionObj, overflow);
						} else {
							utilityActions[i] = this.generateEnabledActionIcon(actionObj, actionId, actionsHandler, overflow);
						}
					} else { // disable
						utilityActions[i] = this.generateDisabledActionIcon(actionObj, actionId, overflow);
					}
				} else {
					utilityActions[i] = (<div key={"toolbar-divider-" + i} className={dividerClassName} />);
				}
			}
			utilityActions[displayItems] = this.generatedExtendedMenu(definition, displayItems, actionsHandler);
		}
		return utilityActions;
	}
	// TODO should be able to merge this method with generateDisabledActionIcon
	generateEnabledActionIcon(actionObj, actionId, actionsHandler, overflow) {
		const overflowClassName = overflow ? "overflow" : "";
		let actionClickHandler = actionObj.callback;
		if (typeof actionsHandler === "function") {
			actionClickHandler = () => actionsHandler(actionObj.action);
		}
		let icon = <Icon type={actionObj.action} />;

		if (actionObj.className) {
			icon = <Icon type={actionObj.action} className={actionObj.className} />;
		}

		if (actionObj.iconEnabled) {
			icon = (<img id={"toolbar-icon-" + actionObj.action} className={"toolbar-icons " + overflowClassName}
				src={actionObj.iconEnabled}
			/>);
		}
		const tooltipId = actionId + "-" + this.props.canvasController.getInstanceId() + "-tooltip";
		let disableTooltip = false;
		if (overflow) {
			disableTooltip = true;
		}
		return (
			<li id={actionId} key={actionId} className={"list-item-containers " + overflowClassName + " " + this.getActionClassName(actionObj.action)}>
				<Tooltip id={tooltipId} tip={actionObj.label} disable={disableTooltip}>
					<a onClick={actionClickHandler} className={"list-item " + overflowClassName} >
						<div className={"toolbar-item " + overflowClassName}>
							{icon}
							{this.generateLabel(false, overflow, actionObj.label)}
						</div>
					</a>
				</Tooltip>
			</li>
		);
	}

	generateDisabledActionIcon(actionObj, actionId, overflow) {
		const overflowClassName = overflow ? "overflow" : "";
		let icon = <Icon type={actionObj.action} disabled />;
		if (actionObj.iconDisabled) {
			icon = (<img id={"toolbar-icon-" + actionObj.action} className={"toolbar-icons " + overflowClassName}
				src={actionObj.iconDisabled}
			/>);
		}

		const tooltipId = actionId + "-" + this.props.canvasController.getInstanceId() + "-tooltip";
		let disableTooltip = false;
		if (overflow) {
			disableTooltip = true;
		}
		return (
			<li id={actionId} key={actionId} className={"list-item-containers " + overflowClassName + " " + this.getActionClassName(actionObj.action)}>
				<Tooltip id={tooltipId} tip={actionObj.label} disable={disableTooltip}>
					<a className={"list-item list-item-disabled " + overflowClassName} >
						<div className={"toolbar-item " + overflowClassName}>
							{icon}
							{this.generateLabel(true, overflow, actionObj.label)}
						</div>
					</a>
				</Tooltip>
			</li>
		);
	}

	generatePaletteIcon(actionObj, overflow) {
		actionObj.action = "paletteOpen";
		actionObj.callback = this.props.canvasController.openPalette.bind(this.props.canvasController);
		let palette = this.generateEnabledActionIcon(actionObj, "palette-open-action", null, overflow);

		if (this.props.isPaletteOpen) {
			actionObj.action = "paletteClose";
			actionObj.callback = this.props.canvasController.closePalette.bind(this.props.canvasController);
			palette = this.generateEnabledActionIcon(actionObj, "palette-close-action", null, overflow);
		}
		return palette;
	}

	generateNotificationIcon(actionObj, actionId, overflow) {
		const notificationStateObj = this.getNotificationIconStateObject(actionObj.enable);
		actionObj.icon = notificationStateObj.icon;
		actionObj.className = notificationStateObj.className;
		actionObj.callback = this.props.canvasController.openNotificationPanel.bind(this.props.canvasController);

		let notification;
		if (actionObj.enable) {
			actionObj.action = constants.NOTIFICATION_BELL_ICON.DOT;
			notification = this.generateEnabledActionIcon(actionObj, "notification-open-action", null, overflow);
		} else {
			actionObj.action = constants.NOTIFICATION_BELL_ICON.DEFAULT;
			notification = this.generateDisabledActionIcon(actionObj, actionId, overflow);
		}

		if (this.props.isNotificationOpen) {
			actionObj.callback = this.props.canvasController.closeNotificationPanel.bind(this.props.canvasController);
			notification = this.generateEnabledActionIcon(actionObj, "notification-close-action", null, overflow);
		}
		return notification;
	}

	generatedExtendedMenu(actions, displayItems, actionsHandler) {
		const subActionsList = actions.slice(displayItems, actions.length);
		const subActionsListItems = this.generateActionItems(subActionsList, subActionsList.length, actionsHandler, true);
		const subMenuClassName = this.state.showExtendedMenu === true ? "" : "toolbar-popover-list-hide";
		return (
			<li id={"overflow-action"} key={"overflow-action"} className="list-item-containers" >
				<a onClick={() => this.toggleShowExtendedMenu()} className="overflow-action-list-item list-item toolbar-divider">
					<div className="toolbar-item">
						<Icon type="overflow" />
					</div>
				</a>
				<ul className={"toolbar-popover-list " + subMenuClassName}>
					{subActionsListItems}
				</ul>
			</li>
		);
	}

	generateLabel(disable, overflow, label) {
		const disabled = disable ? "disabled" : "";
		if (overflow) {
			return (<div className={"overflow-toolbar-icon-label " + disabled}>{label}</div>);
		}
		return (<div />);
	}

	toggleShowExtendedMenu() {
		this.setState({ showExtendedMenu: !this.state.showExtendedMenu });
	}

	toolbarMenuActionHandler(action) {
		this.props.canvasController.toolbarMenuActionHandler(action);
	}

	render() {
		// Get width for toolbar from itemsContainerDivId container in common-canvas. The
		// container doesn't include the palette or fly-out, so no calculation has to be done for the toolbar
		const toolbarWidth = this.props.canvasController.commonCanvas
			? parseFloat(this.getObjectWidth("#" + this.props.canvasController.commonCanvas.itemsContainerDivId))
			: window.innerWidth; // in Jest tests, no common-canvas set
		const that = this;
		let actionContainer = <div />;
		if (this.props.config && this.props.config.length > 0) {
			const displayItems = this.calculateDisplayItems(toolbarWidth);
			const actions = that.generateActionItems(
				that.props.config,
				displayItems,
				this.toolbarMenuActionHandler,
				""
			);
			actionContainer = (<div key={"actions-container"} id={"actions-container"} className="toolbar-items-container">
				{actions}
			</div>);
		}

		let rightAlignedActionItems = [
			{ action: "zoomIn", label: "Zoom In", enable: true, callback: this.props.canvasController.zoomIn.bind(this.props.canvasController) },
			{ action: "zoomOut", label: "Zoom Out", enable: true, callback: this.props.canvasController.zoomOut.bind(this.props.canvasController) },
			{ action: "zoomToFit", label: "Zoom to Fit", enable: true, callback: this.props.canvasController.zoomToFit.bind(this.props.canvasController) }
		];

		if (this.props.notificationConfig &&
			typeof this.props.notificationConfig.action !== "undefined" &&
			typeof this.props.notificationConfig.enable !== "undefined") {
			const notificationBell = [
				{ divider: true },
				this.props.notificationConfig
			];
			rightAlignedActionItems = rightAlignedActionItems.concat(notificationBell);
		}

		const rightAlignedContainerItems = this.generateActionItems(rightAlignedActionItems, rightAlignedActionItems.length, null, "");
		const rightAlignedContainer = (<div id="zoom-actions-container" className="toolbar-items-container">
			{rightAlignedContainerItems}
		</div>);

		const canvasToolbar = (<ObserveSize observerFn={(element) => this.setState({})}>
			<div id="canvas-toolbar">
				<ul id="toolbar-items">
					{actionContainer}
					{rightAlignedContainer}
				</ul>
			</div>
		</ObserveSize>);

		return canvasToolbar;
	}
}

Toolbar.propTypes = {
	config: PropTypes.array,
	isPaletteOpen: PropTypes.bool,
	isNotificationOpen: PropTypes.bool,
	notificationConfig: PropTypes.object,
	canvasController: PropTypes.object.isRequired
};

export default Toolbar;
