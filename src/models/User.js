import { Student } from "./Student.js";
import { Faculty } from "./Faculty.js";
import { Hod } from "./Hod.js";
import { Admin } from "./Admin.js";

export { Student, Faculty, Hod, Admin };

const ALL_MODELS = [Student, Faculty, Hod, Admin];

function getModelForRole(role) {
  if (!role) return null;
  if (role === "student") return Student;
  if (role === "faculty" || role === "teacher") return Faculty;
  if (role === "hod") return Hod;
  if (role === "admin") return Admin;
  return null;
}

function createChainableFindById(id) {
  const operations = [];
  const chain = {
    select(fields) {
      operations.push((q) => q.select(fields));
      return chain;
    },
    populate(...args) {
      operations.push((q) => q.populate(...args));
      return chain;
    },
    lean() {
      operations.push((q) => q.lean());
      return chain;
    },
    async then(resolve, reject) {
      try {
        for (const Model of ALL_MODELS) {
          let q = Model.findById(id);
          for (const op of operations) q = op(q);
          const doc = await q;
          if (doc) return resolve(doc);
        }
        return resolve(null);
      } catch (err) {
        if (reject) return reject(err);
        throw err;
      }
    },
    catch(reject) {
      return chain.then(null, reject);
    },
  };
  return chain;
}

function createChainableFindOne(query = {}) {
  const operations = [];
  const chain = {
    select(fields) {
      operations.push((q) => q.select(fields));
      return chain;
    },
    populate(...args) {
      operations.push((q) => q.populate(...args));
      return chain;
    },
    lean() {
      operations.push((q) => q.lean());
      return chain;
    },
    async then(resolve, reject) {
      try {
        let modelsToSearch = ALL_MODELS;
        if (query.role) {
          if (typeof query.role === "string") {
            const m = getModelForRole(query.role);
            if (m) modelsToSearch = [m];
          } else if (query.role.$in) {
            const mapped = query.role.$in.map(getModelForRole).filter(Boolean);
            if (mapped.length > 0) modelsToSearch = [...new Set(mapped)];
          }
        }
        for (const Model of modelsToSearch) {
          let q = Model.findOne(query);
          for (const op of operations) q = op(q);
          const doc = await q;
          if (doc) return resolve(doc);
        }
        return resolve(null);
      } catch (err) {
        if (reject) return reject(err);
        throw err;
      }
    },
    catch(reject) {
      return chain.then(null, reject);
    },
  };
  return chain;
}

function createChainableFind(query = {}) {
  const operations = [];
  let sortOption = null;
  let skipVal = 0;
  let limitVal = null;
  const chain = {
    select(fields) {
      operations.push((q) => q.select(fields));
      return chain;
    },
    populate(...args) {
      operations.push((q) => q.populate(...args));
      return chain;
    },
    sort(sortArg) {
      sortOption = sortArg;
      operations.push((q) => q.sort(sortArg));
      return chain;
    },
    skip(skipCount) {
      skipVal = Number(skipCount) || 0;
      return chain;
    },
    limit(limitCount) {
      limitVal = Number(limitCount);
      return chain;
    },
    lean() {
      operations.push((q) => q.lean());
      return chain;
    },
    async then(resolve, reject) {
      try {
        let modelsToSearch = ALL_MODELS;
        if (query.role) {
          if (typeof query.role === "string") {
            const m = getModelForRole(query.role);
            if (m) modelsToSearch = [m];
          } else if (query.role.$in) {
            const mapped = query.role.$in.map(getModelForRole).filter(Boolean);
            if (mapped.length > 0) modelsToSearch = [...new Set(mapped)];
          }
        }

        if (modelsToSearch.length === 1) {
          let q = modelsToSearch[0].find(query);
          for (const op of operations) q = op(q);
          if (sortOption) q = q.sort(sortOption);
          if (skipVal) q = q.skip(skipVal);
          if (limitVal !== null && limitVal !== undefined) q = q.limit(limitVal);
          const docs = await q;
          return resolve(docs);
        }

        const results = await Promise.all(
          modelsToSearch.map(async (Model) => {
            let q = Model.find(query);
            for (const op of operations) q = op(q);
            return await q;
          })
        );
        let allDocs = results.flat();
        if (sortOption) {
          const sortKey = typeof sortOption === "object" ? Object.keys(sortOption)[0] : sortOption;
          const sortOrder = typeof sortOption === "object" ? Object.values(sortOption)[0] : 1;
          allDocs.sort((a, b) => {
            const valA = a[sortKey] || 0;
            const valB = b[sortKey] || 0;
            return sortOrder === -1 || sortOrder === "desc" ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
          });
        }
        if (skipVal) allDocs = allDocs.slice(skipVal);
        if (limitVal !== null && limitVal !== undefined) allDocs = allDocs.slice(0, limitVal);
        return resolve(allDocs);
      } catch (err) {
        if (reject) return reject(err);
        throw err;
      }
    },
    catch(reject) {
      return chain.then(null, reject);
    },
  };
  return chain;
}

export const User = {
  Student,
  Faculty,
  Hod,
  Admin,

  findById(id) {
    return createChainableFindById(id);
  },

  findOne(query) {
    return createChainableFindOne(query);
  },

  find(query) {
    return createChainableFind(query);
  },

  async countDocuments(query = {}) {
    let modelsToSearch = ALL_MODELS;
    if (query.role) {
      if (typeof query.role === "string") {
        const m = getModelForRole(query.role);
        if (m) modelsToSearch = [m];
      } else if (query.role.$in) {
        const mapped = query.role.$in.map(getModelForRole).filter(Boolean);
        if (mapped.length > 0) modelsToSearch = [...new Set(mapped)];
      }
    }
    const counts = await Promise.all(modelsToSearch.map((M) => M.countDocuments(query)));
    return counts.reduce((acc, c) => acc + c, 0);
  },

  async create(data) {
    const Model = getModelForRole(data.role) || Student;
    return await Model.create(data);
  },

  async insertMany(docs, options) {
    const groups = { student: [], faculty: [], hod: [], admin: [] };
    for (const doc of docs) {
      const r = doc.role === "teacher" ? "faculty" : doc.role || "student";
      if (groups[r]) groups[r].push(doc);
      else groups.student.push(doc);
    }
    const inserted = [];
    if (groups.student.length) inserted.push(...(await Student.insertMany(groups.student, options)));
    if (groups.faculty.length) inserted.push(...(await Faculty.insertMany(groups.faculty, options)));
    if (groups.hod.length) inserted.push(...(await Hod.insertMany(groups.hod, options)));
    if (groups.admin.length) inserted.push(...(await Admin.insertMany(groups.admin, options)));
    return inserted;
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    for (const Model of ALL_MODELS) {
      const updated = await Model.findByIdAndUpdate(id, update, options);
      if (updated) return updated;
    }
    return null;
  },

  async findByIdAndDelete(id) {
    for (const Model of ALL_MODELS) {
      const deleted = await Model.findByIdAndDelete(id);
      if (deleted) return deleted;
    }
    return null;
  },

  async deleteMany(filter = {}) {
    let modelsToSearch = ALL_MODELS;
    if (filter.role) {
      const m = getModelForRole(filter.role);
      if (m) modelsToSearch = [m];
    }
    const results = await Promise.all(modelsToSearch.map((M) => M.deleteMany(filter)));
    return {
      deletedCount: results.reduce((acc, r) => acc + (r?.deletedCount || 0), 0),
    };
  },

  async deleteOne(filter = {}) {
    let modelsToSearch = ALL_MODELS;
    if (filter.role) {
      const m = getModelForRole(filter.role);
      if (m) modelsToSearch = [m];
    }
    for (const Model of modelsToSearch) {
      const res = await Model.deleteOne(filter);
      if (res && res.deletedCount > 0) return res;
    }
    return { deletedCount: 0 };
  },

  async updateOne(filter, update, options) {
    let modelsToSearch = ALL_MODELS;
    if (filter.role) {
      const m = getModelForRole(filter.role);
      if (m) modelsToSearch = [m];
    }
    for (const Model of modelsToSearch) {
      const res = await Model.updateOne(filter, update, options);
      if (res && res.matchedCount > 0) return res;
    }
    return { matchedCount: 0, modifiedCount: 0 };
  },

  async updateMany(filter, update, options) {
    let modelsToSearch = ALL_MODELS;
    if (filter.role) {
      const m = getModelForRole(filter.role);
      if (m) modelsToSearch = [m];
    }
    let totalMatched = 0;
    let totalModified = 0;
    for (const Model of modelsToSearch) {
      const res = await Model.updateMany(filter, update, options);
      if (res) {
        totalMatched += res.matchedCount || 0;
        totalModified += res.modifiedCount || 0;
      }
    }
    return { matchedCount: totalMatched, modifiedCount: totalModified };
  },

  async aggregate(pipeline) {
    let modelsToSearch = ALL_MODELS;
    const matchStage = pipeline.find((p) => p.$match);
    if (matchStage && matchStage.$match.role) {
      const r = matchStage.$match.role;
      if (typeof r === "string") {
        const m = getModelForRole(r);
        if (m) modelsToSearch = [m];
      } else if (r.$in) {
        const mapped = r.$in.map(getModelForRole).filter(Boolean);
        if (mapped.length > 0) modelsToSearch = [...new Set(mapped)];
      }
    }
    const results = await Promise.all(modelsToSearch.map((M) => M.aggregate(pipeline)));
    return results.flat();
  },

  async distinct(field, query = {}) {
    const results = await Promise.all(ALL_MODELS.map((M) => M.distinct(field, query)));
    return [...new Set(results.flat())];
  },
};

export default User;
