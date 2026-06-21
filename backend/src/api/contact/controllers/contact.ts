/**
 * contact controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::contact.contact', ({ strapi }) => ({
	async find(ctx) {
		const params: any = { populate: '*' };
		// include filters/queries if provided
		try {
			const entities = await strapi.entityService.findMany('api::contact.contact', params);
			ctx.body = { data: entities };
		} catch (e) {
			ctx.throw(500, e as any);
		}
	},

	async findOne(ctx) {
		const { id } = ctx.params;
		try {
			const entity = await strapi.entityService.findOne('api::contact.contact', id, { populate: '*' });
			ctx.body = { data: entity };
		} catch (e) {
			ctx.throw(500, e as any);
		}
	},

	async create(ctx) {
		const body = ctx.request.body && (ctx.request.body.data || ctx.request.body);
		const data = body || {};
		try {
			const entity = await strapi.entityService.create('api::contact.contact', { data });
			ctx.body = { data: entity };
		} catch (e) {
			ctx.throw(500, e as any);
		}
	},

	async update(ctx) {
		const { id } = ctx.params;
		const body = ctx.request.body && (ctx.request.body.data || ctx.request.body);
		try {
			const entity = await strapi.entityService.update('api::contact.contact', id, { data: body });
			ctx.body = { data: entity };
		} catch (e) {
			ctx.throw(500, e as any);
		}
	},

	async delete(ctx) {
		const { id } = ctx.params;
		try {
			const entity = await strapi.entityService.delete('api::contact.contact', id);
			ctx.body = { data: entity };
		} catch (e) {
			ctx.throw(500, e as any);
		}
	}
}));
