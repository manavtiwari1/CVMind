// The V1 launch set. Lessons on these topics are cached per language + level and reused across users;
// any other technical topic is generated fresh.

export const CATALOGUE = [
  { slug: 'arrays-two-pointers', title: 'Arrays and two pointers', aliases: ['arrays', 'array', 'two pointers', 'two pointer', 'two-pointer'] },
  { slug: 'binary-search', title: 'Binary search', aliases: ['binary search'] },
  { slug: 'recursion', title: 'Recursion', aliases: ['recursion', 'recursive functions'] },
  { slug: 'linked-lists', title: 'Linked lists', aliases: ['linked list', 'linked lists', 'linkedlist'] },
  { slug: 'stacks-queues', title: 'Stacks and queues', aliases: ['stack', 'stacks', 'queue', 'queues', 'stacks and queues'] },
  { slug: 'trees-bst', title: 'Trees and BST', aliases: ['trees', 'tree', 'bst', 'binary search tree', 'binary tree', 'binary trees'] },
  { slug: 'graphs-bfs-dfs', title: 'Graphs (BFS/DFS)', aliases: ['graphs', 'graph', 'bfs', 'dfs', 'bfs dfs', 'graph traversal'] },
  { slug: 'hashing', title: 'Hashing', aliases: ['hashing', 'hash map', 'hashmap', 'hash table', 'hash tables'] },
  { slug: 'sorting', title: 'Sorting', aliases: ['sorting', 'sorting algorithms', 'sort'] },
  { slug: 'dbms-normalisation', title: 'DBMS normalisation', aliases: ['normalisation', 'normalization', 'dbms normalization', 'database normalization', 'dbms'] },
  { slug: 'oop-pillars', title: 'OOP pillars', aliases: ['oop', 'oops', 'object oriented programming', 'oop concepts', 'pillars of oop'] },
  { slug: 'os-processes-threads', title: 'OS processes vs threads', aliases: ['processes vs threads', 'process vs thread', 'threads', 'processes and threads', 'os'] },
  { slug: 'rest-apis', title: 'REST APIs', aliases: ['rest', 'rest api', 'rest apis', 'restful api', 'restful apis'] },
  { slug: 'react-hooks', title: 'React hooks', aliases: ['react hooks', 'hooks', 'usestate', 'useeffect'] },
  { slug: 'git-basics', title: 'Git basics', aliases: ['git', 'git basics', 'github basics'] }
];

export function slugify(topic) {
  return String(topic || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const normal = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// The catalogue entry a typed topic means, or null
export function catalogueMatch(topic) {
  const t = normal(topic);
  if (!t) return null;
  return CATALOGUE.find((c) => c.slug === slugify(topic) || normal(c.title) === t || c.aliases.some((a) => normal(a) === t)) || null;
}
