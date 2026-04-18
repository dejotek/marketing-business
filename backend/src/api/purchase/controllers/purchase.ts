/**
 * purchase controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::purchase.purchase', ({ strapi }) => ({
	async create(ctx) {
		try {
			const bodyData = (ctx.request.body && (ctx.request.body.data || ctx.request.body)) || {};
			const payload = { ...(bodyData) };

			// If authenticated user available, set relation and string id
			if (ctx.state && ctx.state.user && ctx.state.user.id) {
				payload.userId = payload.userId || String(ctx.state.user.id);
				payload.user = ctx.state.user.id;
			} else if (payload.userId && !isNaN(Number(payload.userId))) {
				// if userId provided as numeric string, set relation
				payload.user = Number(payload.userId);
			}

			// If courseId is numeric, set course relation
			if (payload.courseId && !isNaN(Number(payload.courseId))) {
				payload.course = Number(payload.courseId);
			}

			// ensure ctx.request.body.data is set for the default create
			ctx.request.body = { data: payload };

			const response = await super.create(ctx);
			return response;
		} catch (err: any) {
			ctx.throw(400, err.message || 'Error creating purchase');
		}
	}
}));
