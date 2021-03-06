import Component from '@ember/component';
import { inject as service } from '@ember/service';
import EmberObject from '@ember/object';

export default Component.extend({
  docsRoute: service(),
  tagName: '',
  label: null,
  route: null,
  model: null,
  didInsertElement() {
    this.docsRoute.routes.pushObject(
      EmberObject.create({
        label: this.label,
        route: this.route,
        model: this.model
      })
    );
  }
});
