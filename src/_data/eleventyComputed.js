export default {
  title: (data) => {
    if (!data.courseId) return data.title;
    return data.curriculum.courses.find((course) => course.id === data.courseId)?.title;
  },
  description: (data) => {
    if (!data.courseId) return data.description;
    return data.curriculum.courses.find((course) => course.id === data.courseId)?.description;
  },
  bodyClass: (data) => data.courseId ? "course-body" : data.bodyClass
};
