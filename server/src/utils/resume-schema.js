function stringSchema() {
  return { type: 'string' };
}

export function normalizeResume(candidateResume = {}) {
  const emptyResume = createEmptyResume();
  const basics = candidateResume.basics || {};

  const normalizedResume = {
    ...emptyResume,
    ...candidateResume,
    awards: Array.isArray(candidateResume.awards) ? candidateResume.awards : [],
    basics: {
      ...emptyResume.basics,
      ...basics,
      location: {
        ...emptyResume.basics.location,
        ...(basics.location || {})
      },
      profiles: Array.isArray(basics.profiles) ? basics.profiles : []
    },
    education: Array.isArray(candidateResume.education) ? candidateResume.education : [],
    projects: Array.isArray(candidateResume.projects) ? candidateResume.projects : [],
    skills: Array.isArray(candidateResume.skills) ? candidateResume.skills : [],
    work: Array.isArray(candidateResume.work) ? candidateResume.work : []
  };

  normalizedResume.work = normalizedResume.work.map((entry) => ({
    endDate: entry.endDate || '',
    highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
    name: entry.name || entry.company || '',
    position: entry.position || '',
    startDate: entry.startDate || '',
    summary: entry.summary || '',
    url: entry.url || ''
  }));

  normalizedResume.education = normalizedResume.education.map((entry) => ({
    area: entry.area || '',
    courses: Array.isArray(entry.courses) ? entry.courses : [],
    endDate: entry.endDate || '',
    institution: entry.institution || '',
    score: entry.score || '',
    startDate: entry.startDate || '',
    studyType: entry.studyType || ''
  }));

  normalizedResume.skills = normalizedResume.skills.map((entry) => ({
    keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
    level: entry.level || '',
    name: entry.name || ''
  }));

  normalizedResume.projects = normalizedResume.projects.map((entry) => ({
    description: entry.description || '',
    highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
    keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
    name: entry.name || '',
    url: entry.url || ''
  }));

  normalizedResume.awards = normalizedResume.awards.map((entry) => ({
    awarder: entry.awarder || '',
    date: entry.date || '',
    summary: entry.summary || '',
    title: entry.title || ''
  }));

  return normalizedResume;
}

export function createEmptyResume() {
  return {
    awards: [],
    basics: {
      email: '',
      label: '',
      location: {
        address: '',
        city: '',
        countryCode: '',
        postalCode: '',
        region: ''
      },
      name: '',
      phone: '',
      profiles: [],
      summary: '',
      url: ''
    },
    education: [],
    projects: [],
    skills: [],
    work: []
  };
}

export const resumeSchema = {
  additionalProperties: true,
  properties: {
    awards: {
      items: {
        additionalProperties: true,
        properties: {
          awarder: stringSchema(),
          date: stringSchema(),
          summary: stringSchema(),
          title: stringSchema()
        },
        type: 'object'
      },
      type: 'array'
    },
    basics: {
      additionalProperties: true,
      properties: {
        email: stringSchema(),
        label: stringSchema(),
        location: {
          additionalProperties: true,
          properties: {
            address: stringSchema(),
            city: stringSchema(),
            countryCode: stringSchema(),
            postalCode: stringSchema(),
            region: stringSchema()
          },
          required: ['address', 'city', 'countryCode', 'postalCode', 'region'],
          type: 'object'
        },
        name: stringSchema(),
        phone: stringSchema(),
        profiles: {
          items: {
            additionalProperties: true,
            properties: {
              network: stringSchema(),
              url: stringSchema(),
              username: stringSchema()
            },
            type: 'object'
          },
          type: 'array'
        },
        summary: stringSchema(),
        url: stringSchema()
      },
      required: ['email', 'label', 'location', 'name', 'phone', 'profiles', 'summary', 'url'],
      type: 'object'
    },
    education: {
      items: {
        additionalProperties: true,
        properties: {
          area: stringSchema(),
          courses: {
            items: stringSchema(),
            type: 'array'
          },
          endDate: stringSchema(),
          institution: stringSchema(),
          score: stringSchema(),
          startDate: stringSchema(),
          studyType: stringSchema()
        },
        type: 'object'
      },
      type: 'array'
    },
    projects: {
      items: {
        additionalProperties: true,
        properties: {
          description: stringSchema(),
          highlights: {
            items: stringSchema(),
            type: 'array'
          },
          keywords: {
            items: stringSchema(),
            type: 'array'
          },
          name: stringSchema(),
          url: stringSchema()
        },
        type: 'object'
      },
      type: 'array'
    },
    skills: {
      items: {
        additionalProperties: true,
        properties: {
          keywords: {
            items: stringSchema(),
            type: 'array'
          },
          level: stringSchema(),
          name: stringSchema()
        },
        type: 'object'
      },
      type: 'array'
    },
    work: {
      items: {
        additionalProperties: true,
        properties: {
          endDate: stringSchema(),
          highlights: {
            items: stringSchema(),
            type: 'array'
          },
          name: stringSchema(),
          position: stringSchema(),
          startDate: stringSchema(),
          summary: stringSchema(),
          url: stringSchema()
        },
        type: 'object'
      },
      type: 'array'
    }
  },
  required: ['awards', 'basics', 'education', 'projects', 'skills', 'work'],
  type: 'object'
};