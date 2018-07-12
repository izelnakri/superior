import ENV from '../config/environment';

export default function(Models) {
  this.urlPrefix = ENV.APP ? ENV.APP.API_HOST : 'http://localhost:3000';

  this.get('/users/:id', () => {
    return { user: { id: 1, name: 'Izel' } };
  })
}