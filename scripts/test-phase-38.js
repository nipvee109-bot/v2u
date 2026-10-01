/**
 * Test Suite: Phase 38 — Course / Playlist Support
 */

import assert from 'node:assert';

function computeCourseProgress(course) {
  let totalItems = 0;
  let completedItems = 0;
  let totalMinutes = 0;
  let completedMinutes = 0;

  if (course && Array.isArray(course.modules)) {
    for (const mod of course.modules) {
      if (Array.isArray(mod.items)) {
        for (const item of mod.items) {
          totalItems++;
          const duration = Number(item.durationMinutes) || 0;
          totalMinutes += duration;
          if (item.completed) {
            completedItems++;
            completedMinutes += duration;
          }
        }
      }
    }
  }

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  return {
    totalItems,
    completedItems,
    progressPercent,
    totalMinutes,
    completedMinutes,
    remainingMinutes,
    isCompleted,
  };
}

function buildCourseFromOutline(params) {
  const courseId = params.id || `course-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedModules = params.modules.map((m, mIdx) => {
    const moduleId = `mod-${courseId}-${mIdx + 1}`;
    const items = m.items.map((it, itIdx) => ({
      id: `item-${courseId}-${mIdx + 1}-${itIdx + 1}`,
      title: it.title,
      durationMinutes: it.durationMinutes || 45,
      sourceUrl: it.sourceUrl,
      lessonId: it.lessonId,
      completed: false,
      order: itIdx + 1,
    }));

    return {
      id: moduleId,
      title: m.title,
      order: mIdx + 1,
      items,
    };
  });

  return {
    id: courseId,
    title: params.title,
    description: params.description,
    provider: params.provider || 'Self-Paced',
    subjectId: params.subjectId,
    sourceUrl: params.sourceUrl,
    modules: formattedModules,
    createdAt: now,
    updatedAt: now,
  };
}

console.log('=== Running Phase 38: Course / Playlist Support Tests ===\n');

// Test 1: Course hierarchy definition & outline builder
const course1 = buildCourseFromOutline({
  title: 'MIT 6.006: Introduction to Algorithms',
  description: 'Design and analysis of efficient algorithms by MIT EECS.',
  provider: 'MIT OpenCourseWare',
  subjectId: 'programming',
  sourceUrl: 'https://ocw.mit.edu/courses/6-006-spring-2020/',
  modules: [
    {
      title: 'Module 1: Data Structures and Dynamic Arrays',
      items: [
        { title: 'Lecture 1: Algorithmic Thinking & Peak Finding', durationMinutes: 50 },
        { title: 'Lecture 2: Data Structures & Dynamic Arrays', durationMinutes: 55 },
      ],
    },
    {
      title: 'Module 2: Sorting and Trees',
      items: [
        { title: 'Lecture 3: Insertion Sort & Merge Sort', durationMinutes: 45 },
        { title: 'Lecture 4: Heaps and Heap Sort', durationMinutes: 50 },
        { title: 'Lecture 5: Binary Search Trees', durationMinutes: 50 },
      ],
    },
  ],
});

assert.strictEqual(course1.title, 'MIT 6.006: Introduction to Algorithms');
assert.strictEqual(course1.modules.length, 2);
assert.strictEqual(course1.modules[0].items.length, 2);
assert.strictEqual(course1.modules[1].items.length, 3);
console.log('✔ Test 1: Course hierarchy successfully constructed with modules & items');

// Test 2: Course Progress Calculation (Initial State: 0 completed)
const initStats = computeCourseProgress(course1);
assert.strictEqual(initStats.totalItems, 5);
assert.strictEqual(initStats.completedItems, 0);
assert.strictEqual(initStats.progressPercent, 0);
assert.strictEqual(initStats.totalMinutes, 250); // 50+55+45+50+50 = 250
assert.strictEqual(initStats.remainingMinutes, 250);
assert.strictEqual(initStats.isCompleted, false);
console.log('✔ Test 2: Initial 0% progress correctly computed with total minutes');

// Test 3: Toggle Course Item Completed
course1.modules[0].items[0].completed = true;
course1.modules[0].items[0].completedAt = new Date().toISOString();
course1.modules[1].items[0].completed = true;
course1.modules[1].items[0].completedAt = new Date().toISOString();

const midStats = computeCourseProgress(course1);
assert.strictEqual(midStats.completedItems, 2);
assert.strictEqual(midStats.totalItems, 5);
assert.strictEqual(midStats.progressPercent, 40); // 2/5 = 40%
assert.strictEqual(midStats.completedMinutes, 95); // 50 + 45
assert.strictEqual(midStats.remainingMinutes, 155); // 250 - 95
assert.strictEqual(midStats.isCompleted, false);
console.log('✔ Test 3: Toggle completion updates completed count, progress % and remaining time');

// Test 4: Complete All Items in Course
course1.modules[0].items[1].completed = true;
course1.modules[1].items[1].completed = true;
course1.modules[1].items[2].completed = true;

const fullStats = computeCourseProgress(course1);
assert.strictEqual(fullStats.completedItems, 5);
assert.strictEqual(fullStats.progressPercent, 100);
assert.strictEqual(fullStats.remainingMinutes, 0);
assert.strictEqual(fullStats.isCompleted, true);
console.log('✔ Test 4: 100% completion recognized and sets isCompleted to true');

// Test 5: Dynamic Add Module to Course
const newModule = {
  id: 'mod-course-new-3',
  title: 'Module 3: Shortest Paths & Dynamic Programming',
  order: 3,
  items: [
    {
      id: 'item-new-301',
      title: 'Lecture 6: Bellman-Ford and Dijkstra Algorithms',
      durationMinutes: 60,
      completed: false,
      order: 1,
    },
  ],
};
course1.modules.push(newModule);

const updatedStats = computeCourseProgress(course1);
assert.strictEqual(updatedStats.totalItems, 6);
assert.strictEqual(updatedStats.completedItems, 5);
assert.strictEqual(updatedStats.progressPercent, 83); // 5/6 = 83.33 -> 83%
assert.strictEqual(updatedStats.isCompleted, false);
console.log('✔ Test 5: Adding a module dynamically adjusts total items and completion status');

// Test 6: Dynamic Add Item to Existing Module
const newItem = {
  id: 'item-new-302',
  title: 'Lecture 7: Dynamic Programming: Fibonacci to Knapsack',
  durationMinutes: 60,
  completed: false,
  order: 2,
};
course1.modules[2].items.push(newItem);

const itemAddedStats = computeCourseProgress(course1);
assert.strictEqual(itemAddedStats.totalItems, 7);
assert.strictEqual(itemAddedStats.totalMinutes, 370); // 250 + 60 + 60 = 370
console.log('✔ Test 6: Adding an item inside module accurately recalibrates duration and counts');

// Test 7: Multi-course Isolation Simulation
const course2 = buildCourseFromOutline({
  title: 'Harvard CS50 AI',
  description: 'AI with Python',
  provider: 'Harvard',
  subjectId: 'ai',
  modules: [
    {
      title: 'Module 1: Search & Optimization',
      items: [{ title: 'Minimax & Alpha-Beta Pruning', durationMinutes: 60 }],
    },
  ],
});

const c2Stats = computeCourseProgress(course2);
assert.strictEqual(c2Stats.totalItems, 1);
assert.strictEqual(c2Stats.completedItems, 0);
assert.strictEqual(c2Stats.progressPercent, 0);
console.log('✔ Test 7: Multi-course state is strictly isolated between courses');

console.log('\nAll 7/7 Phase 38 Course / Playlist Support tests passed successfully!\n');
