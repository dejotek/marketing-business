'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/smtp/send',
      handler: 'smtp.send',
      config: {
        auth: false,
      },
    },
  ],
};