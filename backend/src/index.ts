// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: any }) {
    return (async () => {
      try {
        // Seed sample funnels if none exists
        const funnels = await strapi.entityService.findMany('api::funnel.funnel', { limit: 1 });
        if (!funnels || funnels.length === 0) {
          await strapi.entityService.create('api::funnel.funnel', {
            data: {
              name: 'Sample Funnel',
              blocks: [
                { type: 'hero', title: 'Witamy', content: 'Nagłówek lejka' },
                { type: 'optin', title: 'Zapisz się', content: 'Formularz opt-in' },
                { type: 'thankyou', title: 'Dziękujemy', content: 'Strona dziękczynna' }
              ]
            }
          });
        }

        // Seed integration settings if none
        const ints = await strapi.entityService.findMany('api::integration-settings.integration-settings', { limit: 1 });
        if (!ints || ints.length === 0) {
          await strapi.entityService.create('api::integration-settings.integration-settings', {
            data: { provider: 'google', configured: false, data: {} }
          });
        }

        // Seed richer courses if none exist
        const courses = await strapi.entityService.findMany('api::course.course', { limit: 1 });
        if (!courses || courses.length === 0) {
          const sampleCourses = [
            {
              title: 'Kurs Marketingu Online',
              description: 'Kompletny kurs od A do Z — strategia, treści, reklamy i konwersja',
              price: 199,
              modules: [
                { id: 'm1', title: 'Wprowadzenie', lessons: [{ id:'l1', title:'Wstęp', content:'Wprowadzenie do kursu' }, { id:'l2', title:'Strategia', content:'Podstawy strategii marketingowej' }], exam: { questions:[{ id:'q1', q:'Co jest pierwszym krokiem?', choices:['Analiza','Sprzedaż'], answer:0 }] } },
                { id: 'm2', title: 'Lejek Sprzedaży', lessons: [{ id:'l3', title:'Opt-in', content:'Tworzenie opt-inów' }, { id:'l4', title:'Strony sprzedażowe', content:'Copy i design' }], exam: { questions:[{ id:'q2', q:'Co mierzymy?', choices:['CTR','Kolor'], answer:0 }] } }
              ]
            },
            {
              title: 'Lejek Sprzedaży — praktyka',
              description: 'Budowanie lejków krok po kroku z przykładami',
              price: 99,
              modules: [ { id:'m3', title:'Praktyka', lessons:[{id:'l5', title:'Zadanie 1', content:'Wykonaj lejka A'}], exam: undefined } ]
            },
            {
              title: 'Content Marketing dla SaaS',
              description: 'Tworzenie treści, SEO i dystrybucja',
              price: 149,
              modules: [ { id:'m4', title:'SEO', lessons:[{id:'l6', title:'Słowa kluczowe', content:'Jak szukać słów kluczowych'}], exam: undefined } ]
            }
          ];

          for (const c of sampleCourses) {
            await strapi.entityService.create('api::course.course', { data: c });
          }
        }

        // Seed action logs example
        const logs = await strapi.entityService.findMany('api::action-log.action-log', { limit: 1 });
        if (!logs || logs.length === 0) {
          await strapi.entityService.create('api::action-log.action-log', { data: { type: 'system.seed', userId: 'system', payload: { message: 'Initial seed' }, createdAt: new Date() } });
        }

        // Seed a sample purchase example
        const purchases = await strapi.entityService.findMany('api::purchase.purchase', { limit: 1 });
        if (!purchases || purchases.length === 0) {
          const courseList = await strapi.entityService.findMany('api::course.course', { limit: 1 });
          const courseId = courseList && courseList[0] ? courseList[0].id : null;
          if (courseId) {
            await strapi.entityService.create('api::purchase.purchase', { data: { userId: 'demo-user', courseId: String(courseId), purchasedAt: new Date(), expiresAt: null } });
            await strapi.entityService.create('api::action-log.action-log', { data: { type: 'purchase.created', userId: 'demo-user', payload: { courseId }, createdAt: new Date() } });
          }
        }

      } catch (err) {
        strapi.log.error('Bootstrap seed failed:', err);
      }
    })();
  },
};
