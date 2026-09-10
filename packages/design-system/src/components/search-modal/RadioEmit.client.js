import { Component, define } from "@kickstartds/core/lib/component";

export default class RadioEmit extends Component {
  static identifier = "dsa.radio-emit";

  constructor(element) {
    super(element);

    const { topic, action = "click", value } = element.dataset;
    const handler = () => window._ks.radio.emit(topic, value);
    element.addEventListener(action, handler);

    this.onDisconnect(() => {
      element.removeEventListener(action, handler);
    });
  }
}

define(RadioEmit.identifier, RadioEmit);
