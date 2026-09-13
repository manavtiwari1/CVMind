// Auto-generated 110+ Comprehensive DSA Curated Problems for CVMind Code
export const CURATED_PROBLEMS = [
  {
    "id": "two-sum",
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": [
      "Google",
      "Amazon",
      "Meta",
      "Apple",
      "Microsoft"
    ],
    "acceptanceRate": "54.2%",
    "description": "Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.\n\nYou may assume that each input would have ***exactly one solution***, and you may not use the same element twice.",
    "constraints": [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9"
    ],
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "nums[0] + nums[1] == 9, so return [0, 1]."
      }
    ],
    "functionName": "twoSum",
    "starterCode": {
      "javascript": "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
      "python": "class Solution:\n    def twoSum(self, nums, target):\n        prevMap = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in prevMap:\n                return [prevMap[diff], i]\n            prevMap[n] = i\n        return []",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> m;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (m.count(diff)) return {m[diff], i};\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            2,
            7,
            11,
            15
          ],
          9
        ],
        "expected": [
          0,
          1
        ]
      },
      {
        "input": [
          [
            3,
            2,
            4
          ],
          6
        ],
        "expected": [
          1,
          2
        ]
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            3,
            3
          ],
          6
        ],
        "expected": [
          0,
          1
        ]
      }
    ]
  },
  {
    "id": "valid-anagram",
    "title": "Valid Anagram",
    "slug": "valid-anagram",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": [
      "Google",
      "Amazon",
      "Meta",
      "Uber"
    ],
    "acceptanceRate": "64.5%",
    "description": "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
    "constraints": [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters."
    ],
    "examples": [
      {
        "input": "s = \"anagram\", t = \"nagaram\"",
        "output": "true"
      },
      {
        "input": "s = \"rat\", t = \"car\"",
        "output": "false"
      }
    ],
    "functionName": "isAnagram",
    "starterCode": {
      "javascript": "function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  return s.split('').sort().join('') === t.split('').sort().join('');\n}",
      "python": "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        return sorted(s) == sorted(t)",
      "cpp": "class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        sort(s.begin(), s.end()); sort(t.begin(), t.end()); return s == t;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          "anagram",
          "nagaram"
        ],
        "expected": true
      },
      {
        "input": [
          "rat",
          "car"
        ],
        "expected": false
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          "a",
          "a"
        ],
        "expected": true
      }
    ]
  },
  {
    "id": "contains-duplicate",
    "title": "Contains Duplicate",
    "slug": "contains-duplicate",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": [
      "Apple",
      "Microsoft",
      "Adobe"
    ],
    "acceptanceRate": "62.0%",
    "description": "Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.",
    "constraints": [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    "examples": [
      {
        "input": "nums = [1,2,3,1]",
        "output": "true"
      },
      {
        "input": "nums = [1,2,3,4]",
        "output": "false"
      }
    ],
    "functionName": "containsDuplicate",
    "starterCode": {
      "javascript": "function containsDuplicate(nums) {\n  return new Set(nums).size !== nums.length;\n}",
      "python": "class Solution:\n    def containsDuplicate(self, nums) -> bool:\n        return len(set(nums)) != len(nums)",
      "cpp": "class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        unordered_set<int> s(nums.begin(), nums.end()); return s.size() != nums.size();\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3,
            1
          ]
        ],
        "expected": true
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ]
        ],
        "expected": false
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            1,
            1,
            3,
            3,
            4,
            3,
            2,
            4,
            2
          ]
        ],
        "expected": true
      }
    ]
  },
  {
    "id": "group-anagrams",
    "title": "Group Anagrams",
    "slug": "group-anagrams",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [
      "Amazon",
      "Microsoft",
      "Apple",
      "Meta"
    ],
    "acceptanceRate": "68.2%",
    "description": "Given an array of strings `strs`, group the anagrams together. You can return the answer in **any order**.",
    "constraints": [
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters."
    ],
    "examples": [
      {
        "input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"
      }
    ],
    "functionName": "groupAnagrams",
    "starterCode": {
      "javascript": "function groupAnagrams(strs) {\n  const map = {};\n  for (const s of strs) {\n    const k = s.split('').sort().join('');\n    if (!map[k]) map[k] = [];\n    map[k].push(s);\n  }\n  return Object.values(map);\n}",
      "python": "class Solution:\n    def groupAnagrams(self, strs):\n        from collections import defaultdict\n        res = defaultdict(list)\n        for s in strs:\n            res[tuple(sorted(s))].append(s)\n        return list(res.values())",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        unordered_map<string, vector<string>> m;\n        for (string s : strs) { string t = s; sort(t.begin(), t.end()); m[t].push_back(s); }\n        vector<vector<string>> res; for (auto p : m) res.push_back(p.second); return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            "a"
          ]
        ],
        "expected": [
          [
            "a"
          ]
        ]
      },
      {
        "input": [
          [
            ""
          ]
        ],
        "expected": [
          [
            ""
          ]
        ]
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            "eat",
            "tea",
            "tan",
            "ate",
            "nat",
            "bat"
          ]
        ],
        "expected": [
          [
            "eat",
            "tea",
            "ate"
          ],
          [
            "tan",
            "nat"
          ],
          [
            "bat"
          ]
        ]
      }
    ]
  },
  {
    "id": "top-k-frequent-elements",
    "title": "Top K Frequent Elements",
    "slug": "top-k-frequent-elements",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [
      "Amazon",
      "Facebook",
      "Bloomberg"
    ],
    "acceptanceRate": "63.8%",
    "description": "Given an integer array `nums` and an integer `k`, return *the* `k` *most frequent elements*. You may return the answer in **any order**.",
    "constraints": [
      "1 <= nums.length <= 10^5",
      "k is in range [1, unique elements]"
    ],
    "examples": [
      {
        "input": "nums = [1,1,1,2,2,3], k = 2",
        "output": "[1,2]"
      }
    ],
    "functionName": "topKFrequent",
    "starterCode": {
      "javascript": "function topKFrequent(nums, k) {\n  const count = {};\n  for (let n of nums) count[n] = (count[n] || 0) + 1;\n  return Object.keys(count).sort((a,b) => count[b] - count[a]).slice(0, k).map(Number);\n}",
      "python": "class Solution:\n    def topKFrequent(self, nums, k):\n        from collections import Counter\n        return [x[0] for x in Counter(nums).most_common(k)]",
      "cpp": "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        unordered_map<int, int> count;\n        for (int n : nums) count[n]++;\n        vector<pair<int, int>> v;\n        for (auto p : count) v.push_back({p.second, p.first});\n        sort(v.rbegin(), v.rend());\n        vector<int> res;\n        for (int i = 0; i < k; i++) res.push_back(v[i].second);\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            1,
            1,
            2,
            2,
            3
          ],
          2
        ],
        "expected": [
          1,
          2
        ]
      },
      {
        "input": [
          [
            1
          ],
          1
        ],
        "expected": [
          1
        ]
      }
    ]
  },
  {
    "id": "product-of-array-except-self",
    "title": "Product of Array Except Self",
    "slug": "product-of-array-except-self",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [
      "Amazon",
      "Apple",
      "Asana"
    ],
    "acceptanceRate": "66.1%",
    "description": "Given an integer array `nums`, return *an array* `answer` *such that* `answer[i]` *is equal to the product of all the elements of* `nums` *except* `nums[i]`.\n\nYou must write an algorithm that runs in **O(n)** time and without using the division operation.",
    "constraints": [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30"
    ],
    "examples": [
      {
        "input": "nums = [1,2,3,4]",
        "output": "[24,12,8,6]"
      }
    ],
    "functionName": "productExceptSelf",
    "starterCode": {
      "javascript": "function productExceptSelf(nums) {\n  const n = nums.length;\n  const res = new Array(n).fill(1);\n  let prefix = 1, postfix = 1;\n  for (let i = 0; i < n; i++) {\n    res[i] = prefix;\n    prefix *= nums[i];\n  }\n  for (let i = n - 1; i >= 0; i--) {\n    res[i] *= postfix;\n    postfix *= nums[i];\n  }\n  return res;\n}",
      "python": "class Solution:\n    def productExceptSelf(self, nums):\n        n = len(nums)\n        res = [1] * n\n        prefix, postfix = 1, 1\n        for i in range(n):\n            res[i] = prefix\n            prefix *= nums[i]\n        for i in range(n - 1, -1, -1):\n            res[i] *= postfix\n            postfix *= nums[i]\n        return res",
      "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        int n = nums.size(); vector<int> res(n, 1);\n        int p = 1, s = 1;\n        for (int i = 0; i < n; i++) { res[i] = p; p *= nums[i]; }\n        for (int i = n - 1; i >= 0; i--) { res[i] *= s; s *= nums[i]; }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ]
        ],
        "expected": [
          24,
          12,
          8,
          6
        ]
      },
      {
        "input": [
          [
            -1,
            1,
            0,
            -3,
            3
          ]
        ],
        "expected": [
          0,
          0,
          9,
          0,
          0
        ]
      }
    ]
  },
  {
    "id": "longest-consecutive-sequence",
    "title": "Longest Consecutive Sequence",
    "slug": "longest-consecutive-sequence",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [
      "Google",
      "Microsoft",
      "Spotify"
    ],
    "acceptanceRate": "47.5%",
    "description": "Given an unsorted array of integers `nums`, return *the length of the longest consecutive elements sequence*.\n\nYou must write an algorithm that runs in **O(n)** time.",
    "constraints": [
      "0 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    "examples": [
      {
        "input": "nums = [100,4,200,1,3,2]",
        "output": "4",
        "explanation": "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4."
      }
    ],
    "functionName": "longestConsecutive",
    "starterCode": {
      "javascript": "function longestConsecutive(nums) {\n  const set = new Set(nums);\n  let maxLen = 0;\n  for (let n of set) {\n    if (!set.has(n - 1)) {\n      let curr = n, len = 1;\n      while (set.has(curr + 1)) { curr++; len++; }\n      maxLen = Math.max(maxLen, len);\n    }\n  }\n  return maxLen;\n}",
      "python": "class Solution:\n    def longestConsecutive(self, nums) -> int:\n        numSet = set(nums)\n        longest = 0\n        for n in numSet:\n            if (n - 1) not in numSet:\n                length = 1\n                while (n + length) in numSet:\n                    length += 1\n                longest = max(length, longest)\n        return longest",
      "cpp": "class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        unordered_set<int> s(nums.begin(), nums.end()); int longest = 0;\n        for (int n : s) {\n            if (!s.count(n - 1)) {\n                int length = 1;\n                while (s.count(n + length)) length++;\n                longest = max(longest, length);\n            }\n        }\n        return longest;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            100,
            4,
            200,
            1,
            3,
            2
          ]
        ],
        "expected": 4
      },
      {
        "input": [
          [
            0,
            3,
            7,
            2,
            5,
            8,
            4,
            6,
            0,
            1
          ]
        ],
        "expected": 9
      }
    ]
  },
  {
    "id": "maximum-subarray",
    "title": "Maximum Subarray (Kadane’s)",
    "slug": "maximum-subarray",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [
      "Amazon",
      "Apple",
      "LinkedIn"
    ],
    "acceptanceRate": "51.3%",
    "description": "Given an integer array `nums`, find the subarray with the largest sum, and return *its sum*.",
    "constraints": [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "examples": [
      {
        "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "output": "6",
        "explanation": "The subarray [4,-1,2,1] has the largest sum 6."
      }
    ],
    "functionName": "maxSubArray",
    "starterCode": {
      "javascript": "function maxSubArray(nums) {\n  let maxSoFar = nums[0], curr = 0;\n  for (let n of nums) {\n    curr = Math.max(n, curr + n);\n    maxSoFar = Math.max(maxSoFar, curr);\n  }\n  return maxSoFar;\n}",
      "python": "class Solution:\n    def maxSubArray(self, nums) -> int:\n        maxSub, curSum = nums[0], 0\n        for n in nums:\n            curSum = max(n, curSum + n)\n            maxSub = max(maxSub, curSum)\n        return maxSub",
      "cpp": "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int cur = 0, res = nums[0];\n        for (int n : nums) { cur = max(n, cur + n); res = max(res, cur); }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            -2,
            1,
            -3,
            4,
            -1,
            2,
            1,
            -5,
            4
          ]
        ],
        "expected": 6
      },
      {
        "input": [
          [
            1
          ]
        ],
        "expected": 1
      }
    ]
  },
  {
    "id": "majority-element",
    "title": "Majority Element",
    "slug": "majority-element",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": [
      "Google",
      "Amazon"
    ],
    "acceptanceRate": "65.4%",
    "description": "Given an array `nums` of size `n`, return *the majority element*. The majority element is the element that appears more than `⌊n / 2⌋` times.",
    "constraints": [
      "n == nums.length",
      "1 <= n <= 5 * 10^4"
    ],
    "examples": [
      {
        "input": "nums = [3,2,3]",
        "output": "3"
      },
      {
        "input": "nums = [2,2,1,1,1,2,2]",
        "output": "2"
      }
    ],
    "functionName": "majorityElement",
    "starterCode": {
      "javascript": "function majorityElement(nums) {\n  let count = 0, candidate = null;\n  for (let n of nums) {\n    if (count === 0) candidate = n;\n    count += (n === candidate) ? 1 : -1;\n  }\n  return candidate;\n}",
      "python": "class Solution:\n    def majorityElement(self, nums) -> int:\n        count, res = 0, 0\n        for n in nums:\n            if count == 0: res = n\n            count += (1 if n == res else -1)\n        return res",
      "cpp": "class Solution {\npublic:\n    int majorityElement(vector<int>& nums) {\n        int count = 0, res = 0;\n        for (int n : nums) {\n            if (count == 0) res = n;\n            count += (n == res) ? 1 : -1;\n        }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            3,
            2,
            3
          ]
        ],
        "expected": 3
      },
      {
        "input": [
          [
            2,
            2,
            1,
            1,
            1,
            2,
            2
          ]
        ],
        "expected": 2
      }
    ]
  },
  {
    "id": "sort-colors",
    "title": "Sort Colors (Dutch National Flag)",
    "slug": "sort-colors",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "61.7%",
    "description": "Given an array `nums` with `n` objects colored red, white, or blue, sort them **in-place** so that objects of the same color are adjacent, with the colors in the order red (0), white (1), and blue (2).",
    "constraints": [
      "n == nums.length",
      "1 <= n <= 300",
      "nums[i] is either 0, 1, or 2."
    ],
    "examples": [
      {
        "input": "nums = [2,0,2,1,1,0]",
        "output": "[0,0,1,1,2,2]"
      }
    ],
    "functionName": "sortColors",
    "starterCode": {
      "javascript": "function sortColors(nums) {\n  let low = 0, mid = 0, high = nums.length - 1;\n  while (mid <= high) {\n    if (nums[mid] === 0) {\n      [nums[low], nums[mid]] = [nums[mid], nums[low]];\n      low++; mid++;\n    } else if (nums[mid] === 1) {\n      mid++;\n    } else {\n      [nums[mid], nums[high]] = [nums[high], nums[mid]];\n      high--;\n    }\n  }\n  return nums;\n}",
      "python": "class Solution:\n    def sortColors(self, nums):\n        low, mid, high = 0, 0, len(nums) - 1\n        while mid <= high:\n            if nums[mid] == 0:\n                nums[low], nums[mid] = nums[mid], nums[low]\n                low += 1; mid += 1\n            elif nums[mid] == 1:\n                mid += 1\n            else:\n                nums[mid], nums[high] = nums[high], nums[mid]\n                high -= 1\n        return nums",
      "cpp": "class Solution {\npublic:\n    vector<int> sortColors(vector<int>& nums) {\n        int l = 0, m = 0, h = nums.size() - 1;\n        while (m <= h) {\n            if (nums[m] == 0) swap(nums[l++], nums[m++]);\n            else if (nums[m] == 1) m++;\n            else swap(nums[m], nums[h--]);\n        }\n        return nums;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            2,
            0,
            2,
            1,
            1,
            0
          ]
        ],
        "expected": [
          0,
          0,
          1,
          1,
          2,
          2
        ]
      },
      {
        "input": [
          [
            2,
            0,
            1
          ]
        ],
        "expected": [
          0,
          1,
          2
        ]
      }
    ]
  },
  {
    "id": "valid-palindrome",
    "title": "Valid Palindrome",
    "slug": "valid-palindrome",
    "difficulty": "Easy",
    "category": "Two Pointers",
    "companies": [
      "Meta",
      "Microsoft",
      "Uber"
    ],
    "acceptanceRate": "46.8%",
    "description": "A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
    "constraints": [
      "1 <= s.length <= 2 * 10^5"
    ],
    "examples": [
      {
        "input": "s = \"A man, a plan, a canal: Panama\"",
        "output": "true"
      },
      {
        "input": "s = \"race a car\"",
        "output": "false"
      }
    ],
    "functionName": "isPalindrome",
    "starterCode": {
      "javascript": "function isPalindrome(s) {\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}",
      "python": "class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        clean = ''.join(c.lower() for c in s if c.isalnum())\n        return clean == clean[::-1]",
      "cpp": "class Solution {\npublic:\n    bool isPalindrome(string s) {\n        string clean = \"\";\n        for (char c : s) if (isalnum(c)) clean += tolower(c);\n        string rev = clean; reverse(rev.begin(), rev.end());\n        return clean == rev;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          "A man, a plan, a canal: Panama"
        ],
        "expected": true
      },
      {
        "input": [
          "race a car"
        ],
        "expected": false
      }
    ]
  },
  {
    "id": "two-sum-ii-input-array-is-sorted",
    "title": "Two Sum II - Input Array Is Sorted",
    "slug": "two-sum-ii-input-array-is-sorted",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": [
      "Amazon",
      "Google"
    ],
    "acceptanceRate": "61.4%",
    "description": "Given a **1-indexed** array of integers `numbers` that is already **sorted in non-decreasing order**, find two numbers such that they add up to a specific `target` number.",
    "constraints": [
      "2 <= numbers.length <= 3 * 10^4",
      "-1000 <= numbers[i] <= 1000",
      "Sorted in non-decreasing order"
    ],
    "examples": [
      {
        "input": "numbers = [2,7,11,15], target = 9",
        "output": "[1,2]"
      }
    ],
    "functionName": "twoSum",
    "starterCode": {
      "javascript": "function twoSum(numbers, target) {\n  let l = 0, r = numbers.length - 1;\n  while (l < r) {\n    const s = numbers[l] + numbers[r];\n    if (s === target) return [l + 1, r + 1];\n    if (s < target) l++; else r--;\n  }\n  return [];\n}",
      "python": "class Solution:\n    def twoSum(self, numbers, target):\n        l, r = 0, len(numbers) - 1\n        while l < r:\n            s = numbers[l] + numbers[r]\n            if s == target: return [l + 1, r + 1]\n            if s < target: l += 1\n            else: r -= 1\n        return []",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& numbers, int target) {\n        int l = 0, r = numbers.size() - 1;\n        while (l < r) {\n            int s = numbers[l] + numbers[r];\n            if (s == target) return {l + 1, r + 1};\n            if (s < target) l++; else r--;\n        }\n        return {};\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            2,
            7,
            11,
            15
          ],
          9
        ],
        "expected": [
          1,
          2
        ]
      },
      {
        "input": [
          [
            2,
            3,
            4
          ],
          6
        ],
        "expected": [
          1,
          3
        ]
      }
    ]
  },
  {
    "id": "3sum",
    "title": "3Sum",
    "slug": "3sum",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": [
      "Meta",
      "Amazon",
      "Apple"
    ],
    "acceptanceRate": "34.5%",
    "description": "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    "constraints": [
      "3 <= nums.length <= 3000",
      "-10^5 <= nums[i] <= 10^5"
    ],
    "examples": [
      {
        "input": "nums = [-1,0,1,2,-1,-4]",
        "output": "[[-1,-1,2],[-1,0,1]]"
      }
    ],
    "functionName": "threeSum",
    "starterCode": {
      "javascript": "function threeSum(nums) {\n  nums.sort((a,b) => a - b);\n  const res = [];\n  for (let i = 0; i < nums.length - 2; i++) {\n    if (i > 0 && nums[i] === nums[i-1]) continue;\n    let l = i + 1, r = nums.length - 1;\n    while (l < r) {\n      const sum = nums[i] + nums[l] + nums[r];\n      if (sum === 0) {\n        res.push([nums[i], nums[l], nums[r]]);\n        while (l < r && nums[l] === nums[l+1]) l++;\n        while (l < r && nums[r] === nums[r-1]) r--;\n        l++; r--;\n      } else if (sum < 0) l++; else r--;\n    }\n  }\n  return res;\n}",
      "python": "class Solution:\n    def threeSum(self, nums):\n        nums.sort()\n        res = []\n        for i in range(len(nums) - 2):\n            if i > 0 and nums[i] == nums[i-1]: continue\n            l, r = i + 1, len(nums) - 1\n            while l < r:\n                s = nums[i] + nums[l] + nums[r]\n                if s == 0:\n                    res.append([nums[i], nums[l], nums[r]])\n                    while l < r and nums[l] == nums[l+1]: l += 1\n                    while l < r and nums[r] == nums[r-1]: r -= 1\n                    l += 1; r -= 1\n                elif s < 0: l += 1\n                else: r -= 1\n        return res",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        sort(nums.begin(), nums.end());\n        vector<vector<int>> res;\n        int n = nums.size();\n        for (int i = 0; i < n - 2; i++) {\n            if (i > 0 && nums[i] == nums[i-1]) continue;\n            int l = i + 1, r = n - 1;\n            while (l < r) {\n                int s = nums[i] + nums[l] + nums[r];\n                if (s == 0) {\n                    res.push_back({nums[i], nums[l], nums[r]});\n                    while (l < r && nums[l] == nums[l+1]) l++;\n                    while (l < r && nums[r] == nums[r-1]) r--;\n                    l++; r--;\n                } else if (s < 0) l++; else r--;\n            }\n        }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            0,
            1,
            1
          ]
        ],
        "expected": []
      },
      {
        "input": [
          [
            0,
            0,
            0
          ]
        ],
        "expected": [
          [
            0,
            0,
            0
          ]
        ]
      }
    ]
  },
  {
    "id": "container-with-most-water",
    "title": "Container With Most Water",
    "slug": "container-with-most-water",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "54.9%",
    "description": "You are given an integer array `height` of length `n`. Find two lines that together with the x-axis form a container, such that the container contains the most water.",
    "constraints": [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4"
    ],
    "examples": [
      {
        "input": "height = [1,8,6,2,5,4,8,3,7]",
        "output": "49"
      }
    ],
    "functionName": "maxArea",
    "starterCode": {
      "javascript": "function maxArea(height) {\n  let l = 0, r = height.length - 1, maxW = 0;\n  while (l < r) {\n    maxW = Math.max(maxW, Math.min(height[l], height[r]) * (r - l));\n    if (height[l] < height[r]) l++; else r--;\n  }\n  return maxW;\n}",
      "python": "class Solution:\n    def maxArea(self, height) -> int:\n        l, r = 0, len(height) - 1\n        res = 0\n        while l < r:\n            res = max(res, min(height[l], height[r]) * (r - l))\n            if height[l] < height[r]: l += 1\n            else: r -= 1\n        return res",
      "cpp": "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int l = 0, r = height.size() - 1, res = 0;\n        while (l < r) {\n            res = max(res, min(height[l], height[r]) * (r - l));\n            if (height[l] < height[r]) l++; else r--;\n        }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            8,
            6,
            2,
            5,
            4,
            8,
            3,
            7
          ]
        ],
        "expected": 49
      },
      {
        "input": [
          [
            1,
            1
          ]
        ],
        "expected": 1
      }
    ]
  },
  {
    "id": "trapping-rain-water",
    "title": "Trapping Rain Water",
    "slug": "trapping-rain-water",
    "difficulty": "Hard",
    "category": "Two Pointers",
    "companies": [
      "Google",
      "Goldman Sachs",
      "Amazon",
      "Bloomberg"
    ],
    "acceptanceRate": "61.1%",
    "description": "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
    "constraints": [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5"
    ],
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "output": "6"
      }
    ],
    "functionName": "trap",
    "starterCode": {
      "javascript": "function trap(height) {\n  let l = 0, r = height.length - 1;\n  let leftMax = 0, rightMax = 0, water = 0;\n  while (l < r) {\n    if (height[l] < height[r]) {\n      if (height[l] >= leftMax) leftMax = height[l];\n      else water += leftMax - height[l];\n      l++;\n    } else {\n      if (height[r] >= rightMax) rightMax = height[r];\n      else water += rightMax - height[r];\n      r--;\n    }\n  }\n  return water;\n}",
      "python": "class Solution:\n    def trap(self, height) -> int:\n        l, r = 0, len(height) - 1\n        leftMax, rightMax = 0, 0\n        water = 0\n        while l < r:\n            if height[l] < height[r]:\n                if height[l] >= leftMax: leftMax = height[l]\n                else: water += leftMax - height[l]\n                l += 1\n            else:\n                if height[r] >= rightMax: rightMax = height[r]\n                else: water += rightMax - height[r]\n                r -= 1\n        return water",
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        int l = 0, r = height.size() - 1, lMax = 0, rMax = 0, res = 0;\n        while (l < r) {\n            if (height[l] < height[r]) {\n                if (height[l] >= lMax) lMax = height[l]; else res += lMax - height[l];\n                l++;\n            } else {\n                if (height[r] >= rMax) rMax = height[r]; else res += rMax - height[r];\n                r--;\n            }\n        }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            0,
            1,
            0,
            2,
            1,
            0,
            1,
            3,
            2,
            1,
            2,
            1
          ]
        ],
        "expected": 6
      },
      {
        "input": [
          [
            4,
            2,
            0,
            3,
            2,
            5
          ]
        ],
        "expected": 9
      }
    ]
  },
  {
    "id": "move-zeroes",
    "title": "Move Zeroes",
    "slug": "move-zeroes",
    "difficulty": "Easy",
    "category": "Two Pointers",
    "companies": [
      "Meta",
      "Bloomberg"
    ],
    "acceptanceRate": "61.8%",
    "description": "Given an integer array `nums`, move all `0`'s to the end of it while maintaining the relative order of the non-zero elements.",
    "constraints": [
      "1 <= nums.length <= 10^4"
    ],
    "examples": [
      {
        "input": "nums = [0,1,0,3,12]",
        "output": "[1,3,12,0,0]"
      }
    ],
    "functionName": "moveZeroes",
    "starterCode": {
      "javascript": "function moveZeroes(nums) {\n  let insertPos = 0;\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] !== 0) nums[insertPos++] = nums[i];\n  }\n  while (insertPos < nums.length) nums[insertPos++] = 0;\n  return nums;\n}",
      "python": "class Solution:\n    def moveZeroes(self, nums):\n        pos = 0\n        for i in range(len(nums)):\n            if nums[i] != 0:\n                nums[pos] = nums[i]\n                pos += 1\n        while pos < len(nums):\n            nums[pos] = 0\n            pos += 1\n        return nums",
      "cpp": "class Solution {\npublic:\n    vector<int> moveZeroes(vector<int>& nums) {\n        int pos = 0;\n        for (int x : nums) if (x != 0) nums[pos++] = x;\n        while (pos < nums.size()) nums[pos++] = 0;\n        return nums;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            0,
            1,
            0,
            3,
            12
          ]
        ],
        "expected": [
          1,
          3,
          12,
          0,
          0
        ]
      },
      {
        "input": [
          [
            0
          ]
        ],
        "expected": [
          0
        ]
      }
    ]
  },
  {
    "id": "best-time-to-buy-and-sell-stock",
    "title": "Best Time to Buy and Sell Stock",
    "slug": "best-time-to-buy-and-sell-stock",
    "difficulty": "Easy",
    "category": "Sliding Window",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "60.4%",
    "description": "Solve the standard **Best Time to Buy and Sell Stock** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "maxProfit",
    "starterCode": {
      "javascript": "function maxProfit(prices) {\n  let minPrice = Infinity, maxProfit = 0;\n  for (let p of prices) {\n    minPrice = Math.min(minPrice, p);\n    maxProfit = Math.max(maxProfit, p - minPrice);\n  }\n  return maxProfit;\n}",
      "python": "class Solution:\n    def maxProfit(self, prices) -> int:\n        min_p, max_p = float('inf'), 0\n        for p in prices:\n            min_p = min(min_p, p)\n            max_p = max(max_p, p - min_p)\n        return max_p",
      "cpp": "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minP = 1e9, res = 0;\n        for (int p : prices) { minP = min(minP, p); res = max(res, p - minP); }\n        return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            7,
            1,
            5,
            3,
            6,
            4
          ]
        ],
        "expected": 5
      },
      {
        "input": [
          [
            7,
            6,
            4,
            3,
            1
          ]
        ],
        "expected": 0
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            7,
            1,
            5,
            3,
            6,
            4
          ]
        ],
        "expected": 5
      },
      {
        "input": [
          [
            7,
            6,
            4,
            3,
            1
          ]
        ],
        "expected": 0
      }
    ]
  },
  {
    "id": "longest-substring-without-repeating-characters",
    "title": "Longest Substring Without Repeating Characters",
    "slug": "longest-substring-without-repeating-characters",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "34.8%",
    "description": "Solve the standard **Longest Substring Without Repeating Characters** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "lengthOfLongestSubstring",
    "starterCode": {
      "javascript": "function lengthOfLongestSubstring(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def lengthOfLongestSubstring(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto lengthOfLongestSubstring(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "longest-repeating-character-replacement",
    "title": "Longest Repeating Character Replacement",
    "slug": "longest-repeating-character-replacement",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "53.6%",
    "description": "Solve the standard **Longest Repeating Character Replacement** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "characterReplacement",
    "starterCode": {
      "javascript": "function characterReplacement(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def characterReplacement(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto characterReplacement(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "permutation-in-string",
    "title": "Permutation in String",
    "slug": "permutation-in-string",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "44.3%",
    "description": "Solve the standard **Permutation in String** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "checkInclusion",
    "starterCode": {
      "javascript": "function checkInclusion(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def checkInclusion(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto checkInclusion(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "minimum-window-substring",
    "title": "Minimum Window Substring",
    "slug": "minimum-window-substring",
    "difficulty": "Hard",
    "category": "Sliding Window",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "42.1%",
    "description": "Solve the standard **Minimum Window Substring** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "minWindow",
    "starterCode": {
      "javascript": "function minWindow(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def minWindow(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto minWindow(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "sliding-window-maximum",
    "title": "Sliding Window Maximum",
    "slug": "sliding-window-maximum",
    "difficulty": "Hard",
    "category": "Sliding Window",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "46.7%",
    "description": "Solve the standard **Sliding Window Maximum** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "maxSlidingWindow",
    "starterCode": {
      "javascript": "function maxSlidingWindow(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def maxSlidingWindow(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto maxSlidingWindow(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "find-all-anagrams-in-a-string",
    "title": "Find All Anagrams in a String",
    "slug": "find-all-anagrams-in-a-string",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "50.2%",
    "description": "Solve the standard **Find All Anagrams in a String** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "findAnagrams",
    "starterCode": {
      "javascript": "function findAnagrams(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def findAnagrams(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto findAnagrams(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "minimum-size-subarray-sum",
    "title": "Minimum Size Subarray Sum",
    "slug": "minimum-size-subarray-sum",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "46.5%",
    "description": "Solve the standard **Minimum Size Subarray Sum** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "minSubArrayLen",
    "starterCode": {
      "javascript": "function minSubArrayLen(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def minSubArrayLen(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto minSubArrayLen(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "valid-parentheses",
    "title": "Valid Parentheses",
    "slug": "valid-parentheses",
    "difficulty": "Easy",
    "category": "Stack",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "41.8%",
    "description": "Solve the standard **Valid Parentheses** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "isValid",
    "starterCode": {
      "javascript": "function isValid(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let c of s) {\n    if (map[c]) {\n      if (stack.pop() !== map[c]) return false;\n    } else stack.push(c);\n  }\n  return stack.length === 0;\n}",
      "python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        stack = []\n        mapping = {')': '(', '}': '{', ']': '['}\n        for char in s:\n            if char in mapping:\n                top = stack.pop() if stack else '#'\n                if mapping[char] != top: return False\n            else:\n                stack.append(char)\n        return not stack",
      "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        stack<char> st;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) return false;\n                if (c == ')' && st.top() != '(') return false;\n                if (c == '}' && st.top() != '{') return false;\n                if (c == ']' && st.top() != '[') return false;\n                st.pop();\n            }\n        }\n        return st.empty();\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          "()"
        ],
        "expected": true
      },
      {
        "input": [
          "()[]{}"
        ],
        "expected": true
      },
      {
        "input": [
          "(]"
        ],
        "expected": false
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          "()"
        ],
        "expected": true
      },
      {
        "input": [
          "()[]{}"
        ],
        "expected": true
      },
      {
        "input": [
          "(]"
        ],
        "expected": false
      }
    ]
  },
  {
    "id": "min-stack",
    "title": "Min Stack",
    "slug": "min-stack",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "53.2%",
    "description": "Solve the standard **Min Stack** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "MinStack",
    "starterCode": {
      "javascript": "function MinStack(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def MinStack(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto MinStack(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "evaluate-reverse-polish-notation",
    "title": "Evaluate Reverse Polish Notation",
    "slug": "evaluate-reverse-polish-notation",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "49.8%",
    "description": "Solve the standard **Evaluate Reverse Polish Notation** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "evalRPN",
    "starterCode": {
      "javascript": "function evalRPN(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def evalRPN(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto evalRPN(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "generate-parentheses",
    "title": "Generate Parentheses",
    "slug": "generate-parentheses",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "74.2%",
    "description": "Solve the standard **Generate Parentheses** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "generateParenthesis",
    "starterCode": {
      "javascript": "function generateParenthesis(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def generateParenthesis(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto generateParenthesis(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "daily-temperatures",
    "title": "Daily Temperatures",
    "slug": "daily-temperatures",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "66.1%",
    "description": "Solve the standard **Daily Temperatures** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "dailyTemperatures",
    "starterCode": {
      "javascript": "function dailyTemperatures(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def dailyTemperatures(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto dailyTemperatures(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "car-fleet",
    "title": "Car Fleet",
    "slug": "car-fleet",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "50.7%",
    "description": "Solve the standard **Car Fleet** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "carFleet",
    "starterCode": {
      "javascript": "function carFleet(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def carFleet(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto carFleet(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "largest-rectangle-in-histogram",
    "title": "Largest Rectangle in Histogram",
    "slug": "largest-rectangle-in-histogram",
    "difficulty": "Hard",
    "category": "Stack",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "43.9%",
    "description": "Solve the standard **Largest Rectangle in Histogram** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "largestRectangleArea",
    "starterCode": {
      "javascript": "function largestRectangleArea(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def largestRectangleArea(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto largestRectangleArea(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "asteroid-collision",
    "title": "Asteroid Collision",
    "slug": "asteroid-collision",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "45.1%",
    "description": "Solve the standard **Asteroid Collision** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "asteroidCollision",
    "starterCode": {
      "javascript": "function asteroidCollision(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def asteroidCollision(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto asteroidCollision(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "binary-search",
    "title": "Binary Search",
    "slug": "binary-search",
    "difficulty": "Easy",
    "category": "Binary Search",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "57.8%",
    "description": "Solve the standard **Binary Search** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "search",
    "starterCode": {
      "javascript": "function search(nums, target) {\n  let l = 0, r = nums.length - 1;\n  while (l <= r) {\n    const m = Math.floor((l + r) / 2);\n    if (nums[m] === target) return m;\n    if (nums[m] < target) l = m + 1; else r = m - 1;\n  }\n  return -1;\n}",
      "python": "class Solution:\n    def search(self, nums, target: int) -> int:\n        l, r = 0, len(nums) - 1\n        while l <= r:\n            m = (l + r) // 2\n            if nums[m] == target: return m\n            elif nums[m] < target: l = m + 1\n            else: r = m - 1\n        return -1",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        int l = 0, r = nums.size() - 1;\n        while (l <= r) {\n            int m = l + (r - l) / 2;\n            if (nums[m] == target) return m;\n            if (nums[m] < target) l = m + 1; else r = m - 1;\n        }\n        return -1;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            -1,
            0,
            3,
            5,
            9,
            12
          ],
          9
        ],
        "expected": 4
      },
      {
        "input": [
          [
            -1,
            0,
            3,
            5,
            9,
            12
          ],
          2
        ],
        "expected": -1
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            -1,
            0,
            3,
            5,
            9,
            12
          ],
          9
        ],
        "expected": 4
      },
      {
        "input": [
          [
            -1,
            0,
            3,
            5,
            9,
            12
          ],
          2
        ],
        "expected": -1
      }
    ]
  },
  {
    "id": "search-a-2d-matrix",
    "title": "Search a 2D Matrix",
    "slug": "search-a-2d-matrix",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "49.8%",
    "description": "Solve the standard **Search a 2D Matrix** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "searchMatrix",
    "starterCode": {
      "javascript": "function searchMatrix(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def searchMatrix(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto searchMatrix(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "koko-eating-bananas",
    "title": "Koko Eating Bananas",
    "slug": "koko-eating-bananas",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "50.1%",
    "description": "Solve the standard **Koko Eating Bananas** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "minEatingSpeed",
    "starterCode": {
      "javascript": "function minEatingSpeed(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def minEatingSpeed(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto minEatingSpeed(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "find-minimum-in-rotated-sorted-array",
    "title": "Find Minimum in Rotated Sorted Array",
    "slug": "find-minimum-in-rotated-sorted-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "50.4%",
    "description": "Solve the standard **Find Minimum in Rotated Sorted Array** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "findMin",
    "starterCode": {
      "javascript": "function findMin(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def findMin(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto findMin(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "search-in-rotated-sorted-array",
    "title": "Search in Rotated Sorted Array",
    "slug": "search-in-rotated-sorted-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "40.6%",
    "description": "Solve the standard **Search in Rotated Sorted Array** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "search",
    "starterCode": {
      "javascript": "function search(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def search(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto search(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "time-based-key-value-store",
    "title": "Time Based Key-Value Store",
    "slug": "time-based-key-value-store",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "53.4%",
    "description": "Solve the standard **Time Based Key-Value Store** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "TimeMap",
    "starterCode": {
      "javascript": "function TimeMap(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def TimeMap(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto TimeMap(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "median-of-two-sorted-arrays",
    "title": "Median of Two Sorted Arrays",
    "slug": "median-of-two-sorted-arrays",
    "difficulty": "Hard",
    "category": "Binary Search",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "39.8%",
    "description": "Solve the standard **Median of Two Sorted Arrays** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "findMedianSortedArrays",
    "starterCode": {
      "javascript": "function findMedianSortedArrays(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def findMedianSortedArrays(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto findMedianSortedArrays(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "peak-index-in-a-mountain-array",
    "title": "Peak Index in a Mountain Array",
    "slug": "peak-index-in-a-mountain-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "69.0%",
    "description": "Solve the standard **Peak Index in a Mountain Array** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "peakIndexInMountainArray",
    "starterCode": {
      "javascript": "function peakIndexInMountainArray(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def peakIndexInMountainArray(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto peakIndexInMountainArray(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "reverse-linked-list",
    "title": "Reverse Linked List",
    "slug": "reverse-linked-list",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "75.2%",
    "description": "Solve the standard **Reverse Linked List** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "reverseList",
    "starterCode": {
      "javascript": "function reverseList(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def reverseList(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto reverseList(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "merge-two-sorted-lists",
    "title": "Merge Two Sorted Lists",
    "slug": "merge-two-sorted-lists",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "64.1%",
    "description": "Solve the standard **Merge Two Sorted Lists** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "mergeTwoLists",
    "starterCode": {
      "javascript": "function mergeTwoLists(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def mergeTwoLists(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto mergeTwoLists(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "reorder-list",
    "title": "Reorder List",
    "slug": "reorder-list",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "55.6%",
    "description": "Solve the standard **Reorder List** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "reorderList",
    "starterCode": {
      "javascript": "function reorderList(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def reorderList(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto reorderList(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "remove-nth-node-from-end-of-list",
    "title": "Remove Nth Node From End of List",
    "slug": "remove-nth-node-from-end-of-list",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "44.8%",
    "description": "Solve the standard **Remove Nth Node From End of List** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "removeNthFromEnd",
    "starterCode": {
      "javascript": "function removeNthFromEnd(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def removeNthFromEnd(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto removeNthFromEnd(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "copy-list-with-random-pointer",
    "title": "Copy List with Random Pointer",
    "slug": "copy-list-with-random-pointer",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "55.9%",
    "description": "Solve the standard **Copy List with Random Pointer** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "copyRandomList",
    "starterCode": {
      "javascript": "function copyRandomList(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def copyRandomList(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto copyRandomList(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "add-two-numbers",
    "title": "Add Two Numbers",
    "slug": "add-two-numbers",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "42.6%",
    "description": "Solve the standard **Add Two Numbers** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "addTwoNumbers",
    "starterCode": {
      "javascript": "function addTwoNumbers(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def addTwoNumbers(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto addTwoNumbers(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "linked-list-cycle",
    "title": "Linked List Cycle",
    "slug": "linked-list-cycle",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "49.8%",
    "description": "Solve the standard **Linked List Cycle** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "hasCycle",
    "starterCode": {
      "javascript": "function hasCycle(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def hasCycle(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto hasCycle(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "find-the-duplicate-number",
    "title": "Find the Duplicate Number",
    "slug": "find-the-duplicate-number",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "60.2%",
    "description": "Solve the standard **Find the Duplicate Number** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "findDuplicate",
    "starterCode": {
      "javascript": "function findDuplicate(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def findDuplicate(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto findDuplicate(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "lru-cache",
    "title": "LRU Cache",
    "slug": "lru-cache",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "42.9%",
    "description": "Solve the standard **LRU Cache** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "LRUCache",
    "starterCode": {
      "javascript": "function LRUCache(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def LRUCache(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto LRUCache(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "merge-k-sorted-lists",
    "title": "Merge k Sorted Lists",
    "slug": "merge-k-sorted-lists",
    "difficulty": "Hard",
    "category": "Linked List",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "51.9%",
    "description": "Solve the standard **Merge k Sorted Lists** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "mergeKLists",
    "starterCode": {
      "javascript": "function mergeKLists(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def mergeKLists(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto mergeKLists(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "invert-binary-tree",
    "title": "Invert Binary Tree",
    "slug": "invert-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "77.1%",
    "description": "Solve the standard **Invert Binary Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "invertTree",
    "starterCode": {
      "javascript": "function invertTree(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def invertTree(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto invertTree(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "maximum-depth-of-binary-tree",
    "title": "Maximum Depth of Binary Tree",
    "slug": "maximum-depth-of-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "75.9%",
    "description": "Solve the standard **Maximum Depth of Binary Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "maxDepth",
    "starterCode": {
      "javascript": "function maxDepth(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def maxDepth(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto maxDepth(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "diameter-of-binary-tree",
    "title": "Diameter of Binary Tree",
    "slug": "diameter-of-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "59.6%",
    "description": "Solve the standard **Diameter of Binary Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "diameterOfBinaryTree",
    "starterCode": {
      "javascript": "function diameterOfBinaryTree(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def diameterOfBinaryTree(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto diameterOfBinaryTree(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "balanced-binary-tree",
    "title": "Balanced Binary Tree",
    "slug": "balanced-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "51.4%",
    "description": "Solve the standard **Balanced Binary Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "isBalanced",
    "starterCode": {
      "javascript": "function isBalanced(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def isBalanced(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto isBalanced(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "same-tree",
    "title": "Same Tree",
    "slug": "same-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "61.2%",
    "description": "Solve the standard **Same Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "isSameTree",
    "starterCode": {
      "javascript": "function isSameTree(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def isSameTree(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto isSameTree(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "subtree-of-another-tree",
    "title": "Subtree of Another Tree",
    "slug": "subtree-of-another-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "47.5%",
    "description": "Solve the standard **Subtree of Another Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "isSubtree",
    "starterCode": {
      "javascript": "function isSubtree(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def isSubtree(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto isSubtree(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "lowest-common-ancestor-of-a-bst",
    "title": "Lowest Common Ancestor of a BST",
    "slug": "lowest-common-ancestor-of-a-bst",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "64.5%",
    "description": "Solve the standard **Lowest Common Ancestor of a BST** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "lowestCommonAncestor",
    "starterCode": {
      "javascript": "function lowestCommonAncestor(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def lowestCommonAncestor(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto lowestCommonAncestor(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "binary-tree-level-order-traversal",
    "title": "Binary Tree Level Order Traversal",
    "slug": "binary-tree-level-order-traversal",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "66.8%",
    "description": "Solve the standard **Binary Tree Level Order Traversal** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "levelOrder",
    "starterCode": {
      "javascript": "function levelOrder(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def levelOrder(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto levelOrder(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "binary-tree-right-side-view",
    "title": "Binary Tree Right Side View",
    "slug": "binary-tree-right-side-view",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "63.9%",
    "description": "Solve the standard **Binary Tree Right Side View** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "rightSideView",
    "starterCode": {
      "javascript": "function rightSideView(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def rightSideView(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto rightSideView(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "count-good-nodes-in-binary-tree",
    "title": "Count Good Nodes in Binary Tree",
    "slug": "count-good-nodes-in-binary-tree",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "74.2%",
    "description": "Solve the standard **Count Good Nodes in Binary Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "goodNodes",
    "starterCode": {
      "javascript": "function goodNodes(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def goodNodes(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto goodNodes(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "validate-binary-search-tree",
    "title": "Validate Binary Search Tree",
    "slug": "validate-binary-search-tree",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "33.1%",
    "description": "Solve the standard **Validate Binary Search Tree** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "isValidBST",
    "starterCode": {
      "javascript": "function isValidBST(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def isValidBST(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto isValidBST(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "kth-smallest-element-in-a-bst",
    "title": "Kth Smallest Element in a BST",
    "slug": "kth-smallest-element-in-a-bst",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "72.3%",
    "description": "Solve the standard **Kth Smallest Element in a BST** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "kthSmallest",
    "starterCode": {
      "javascript": "function kthSmallest(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def kthSmallest(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto kthSmallest(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "number-of-islands",
    "title": "Number of Islands",
    "slug": "number-of-islands",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "58.7%",
    "description": "Solve the standard **Number of Islands** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "numIslands",
    "starterCode": {
      "javascript": "function numIslands(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def numIslands(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto numIslands(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "clone-graph",
    "title": "Clone Graph",
    "slug": "clone-graph",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "56.4%",
    "description": "Solve the standard **Clone Graph** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "cloneGraph",
    "starterCode": {
      "javascript": "function cloneGraph(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def cloneGraph(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto cloneGraph(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "max-area-of-island",
    "title": "Max Area of Island",
    "slug": "max-area-of-island",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "72.5%",
    "description": "Solve the standard **Max Area of Island** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "maxAreaOfIsland",
    "starterCode": {
      "javascript": "function maxAreaOfIsland(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def maxAreaOfIsland(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto maxAreaOfIsland(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "pacific-atlantic-water-flow",
    "title": "Pacific Atlantic Water Flow",
    "slug": "pacific-atlantic-water-flow",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "55.3%",
    "description": "Solve the standard **Pacific Atlantic Water Flow** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "pacificAtlantic",
    "starterCode": {
      "javascript": "function pacificAtlantic(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def pacificAtlantic(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto pacificAtlantic(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "surrounded-regions",
    "title": "Surrounded Regions",
    "slug": "surrounded-regions",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "39.8%",
    "description": "Solve the standard **Surrounded Regions** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "solve",
    "starterCode": {
      "javascript": "function solve(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def solve(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto solve(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "rotting-oranges",
    "title": "Rotting Oranges",
    "slug": "rotting-oranges",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "54.5%",
    "description": "Solve the standard **Rotting Oranges** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "orangesRotting",
    "starterCode": {
      "javascript": "function orangesRotting(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def orangesRotting(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto orangesRotting(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "course-schedule",
    "title": "Course Schedule",
    "slug": "course-schedule",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "46.9%",
    "description": "Solve the standard **Course Schedule** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "canFinish",
    "starterCode": {
      "javascript": "function canFinish(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def canFinish(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto canFinish(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "course-schedule-ii",
    "title": "Course Schedule II",
    "slug": "course-schedule-ii",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "50.1%",
    "description": "Solve the standard **Course Schedule II** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "findOrder",
    "starterCode": {
      "javascript": "function findOrder(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def findOrder(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto findOrder(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "climbing-stairs",
    "title": "Climbing Stairs",
    "slug": "climbing-stairs",
    "difficulty": "Easy",
    "category": "Dynamic Programming",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "53.1%",
    "description": "Solve the standard **Climbing Stairs** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "climbStairs",
    "starterCode": {
      "javascript": "function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) { const c = a + b; a = b; b = c; }\n  return b;\n}",
      "python": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        a, b = 1, 2\n        for _ in range(n - 1): a, b = b, a + b\n        return a",
      "cpp": "class Solution {\npublic:\n    int climbStairs(int n) {\n        if (n <= 2) return n;\n        int a = 1, b = 2;\n        for (int i = 3; i <= n; i++) { int c = a + b; a = b; b = c; }\n        return b;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          2
        ],
        "expected": 2
      },
      {
        "input": [
          3
        ],
        "expected": 3
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          2
        ],
        "expected": 2
      },
      {
        "input": [
          3
        ],
        "expected": 3
      }
    ]
  },
  {
    "id": "min-cost-climbing-stairs",
    "title": "Min Cost Climbing Stairs",
    "slug": "min-cost-climbing-stairs",
    "difficulty": "Easy",
    "category": "Dynamic Programming",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "65.2%",
    "description": "Solve the standard **Min Cost Climbing Stairs** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "minCostClimbingStairs",
    "starterCode": {
      "javascript": "function minCostClimbingStairs(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def minCostClimbingStairs(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto minCostClimbingStairs(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "house-robber",
    "title": "House Robber",
    "slug": "house-robber",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "50.8%",
    "description": "Solve the standard **House Robber** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "rob",
    "starterCode": {
      "javascript": "function rob(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def rob(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto rob(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "house-robber-ii",
    "title": "House Robber II",
    "slug": "house-robber-ii",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "41.9%",
    "description": "Solve the standard **House Robber II** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "rob",
    "starterCode": {
      "javascript": "function rob(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def rob(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto rob(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "longest-palindromic-substring",
    "title": "Longest Palindromic Substring",
    "slug": "longest-palindromic-substring",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "33.9%",
    "description": "Solve the standard **Longest Palindromic Substring** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "longestPalindrome",
    "starterCode": {
      "javascript": "function longestPalindrome(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def longestPalindrome(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto longestPalindrome(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "palindromic-substrings",
    "title": "Palindromic Substrings",
    "slug": "palindromic-substrings",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "68.9%",
    "description": "Solve the standard **Palindromic Substrings** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "countSubstrings",
    "starterCode": {
      "javascript": "function countSubstrings(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def countSubstrings(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto countSubstrings(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "decode-ways",
    "title": "Decode Ways",
    "slug": "decode-ways",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "34.6%",
    "description": "Solve the standard **Decode Ways** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "numDecodings",
    "starterCode": {
      "javascript": "function numDecodings(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def numDecodings(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto numDecodings(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "coin-change",
    "title": "Coin Change",
    "slug": "coin-change",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "44.2%",
    "description": "Solve the standard **Coin Change** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "coinChange",
    "starterCode": {
      "javascript": "function coinChange(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def coinChange(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto coinChange(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "maximum-product-subarray",
    "title": "Maximum Product Subarray",
    "slug": "maximum-product-subarray",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "35.4%",
    "description": "Solve the standard **Maximum Product Subarray** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "maxProduct",
    "starterCode": {
      "javascript": "function maxProduct(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def maxProduct(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto maxProduct(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "word-break",
    "title": "Word Break",
    "slug": "word-break",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "46.8%",
    "description": "Solve the standard **Word Break** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "wordBreak",
    "starterCode": {
      "javascript": "function wordBreak(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def wordBreak(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto wordBreak(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "longest-increasing-subsequence",
    "title": "Longest Increasing Subsequence",
    "slug": "longest-increasing-subsequence",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "54.6%",
    "description": "Solve the standard **Longest Increasing Subsequence** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "lengthOfLIS",
    "starterCode": {
      "javascript": "function lengthOfLIS(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def lengthOfLIS(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto lengthOfLIS(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "unique-paths",
    "title": "Unique Paths",
    "slug": "unique-paths",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "64.1%",
    "description": "Solve the standard **Unique Paths** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "uniquePaths",
    "starterCode": {
      "javascript": "function uniquePaths(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def uniquePaths(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto uniquePaths(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "jump-game",
    "title": "Jump Game",
    "slug": "jump-game",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "39.2%",
    "description": "Solve the standard **Jump Game** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "canJump",
    "starterCode": {
      "javascript": "function canJump(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def canJump(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto canJump(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "jump-game-ii",
    "title": "Jump Game II",
    "slug": "jump-game-ii",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "45.8%",
    "description": "Solve the standard **Jump Game II** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "jump",
    "starterCode": {
      "javascript": "function jump(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def jump(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto jump(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "gas-station",
    "title": "Gas Station",
    "slug": "gas-station",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "46.3%",
    "description": "Solve the standard **Gas Station** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "canCompleteCircuit",
    "starterCode": {
      "javascript": "function canCompleteCircuit(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def canCompleteCircuit(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto canCompleteCircuit(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "insert-interval",
    "title": "Insert Interval",
    "slug": "insert-interval",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "40.7%",
    "description": "Solve the standard **Insert Interval** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "insert",
    "starterCode": {
      "javascript": "function insert(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def insert(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto insert(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "merge-intervals",
    "title": "Merge Intervals",
    "slug": "merge-intervals",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "47.3%",
    "description": "Solve the standard **Merge Intervals** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "merge",
    "starterCode": {
      "javascript": "function merge(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def merge(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto merge(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "non-overlapping-intervals",
    "title": "Non-overlapping Intervals",
    "slug": "non-overlapping-intervals",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "52.7%",
    "description": "Solve the standard **Non-overlapping Intervals** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "eraseOverlapIntervals",
    "starterCode": {
      "javascript": "function eraseOverlapIntervals(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def eraseOverlapIntervals(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto eraseOverlapIntervals(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "subsets",
    "title": "Subsets",
    "slug": "subsets",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "77.2%",
    "description": "Solve the standard **Subsets** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "subsets",
    "starterCode": {
      "javascript": "function subsets(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def subsets(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto subsets(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "combination-sum",
    "title": "Combination Sum",
    "slug": "combination-sum",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "71.5%",
    "description": "Solve the standard **Combination Sum** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "combinationSum",
    "starterCode": {
      "javascript": "function combinationSum(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def combinationSum(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto combinationSum(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "permutations",
    "title": "Permutations",
    "slug": "permutations",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "78.2%",
    "description": "Solve the standard **Permutations** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "permute",
    "starterCode": {
      "javascript": "function permute(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def permute(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto permute(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "subsets-ii",
    "title": "Subsets II",
    "slug": "subsets-ii",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "57.4%",
    "description": "Solve the standard **Subsets II** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "subsetsWithDup",
    "starterCode": {
      "javascript": "function subsetsWithDup(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def subsetsWithDup(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto subsetsWithDup(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "combination-sum-ii",
    "title": "Combination Sum II",
    "slug": "combination-sum-ii",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "55.1%",
    "description": "Solve the standard **Combination Sum II** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "combinationSum2",
    "starterCode": {
      "javascript": "function combinationSum2(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def combinationSum2(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto combinationSum2(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "word-search",
    "title": "Word Search",
    "slug": "word-search",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "42.3%",
    "description": "Solve the standard **Word Search** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "exist",
    "starterCode": {
      "javascript": "function exist(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def exist(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto exist(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "n-queens",
    "title": "N-Queens",
    "slug": "n-queens",
    "difficulty": "Hard",
    "category": "Backtracking & Heaps",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "68.2%",
    "description": "Solve the standard **N-Queens** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "solveNQueens",
    "starterCode": {
      "javascript": "function solveNQueens(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def solveNQueens(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto solveNQueens(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "kth-largest-element-in-a-stream",
    "title": "Kth Largest Element in a Stream",
    "slug": "kth-largest-element-in-a-stream",
    "difficulty": "Easy",
    "category": "Backtracking & Heaps",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "58.0%",
    "description": "Solve the standard **Kth Largest Element in a Stream** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "KthLargest",
    "starterCode": {
      "javascript": "function KthLargest(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def KthLargest(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto KthLargest(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "last-stone-weight",
    "title": "Last Stone Weight",
    "slug": "last-stone-weight",
    "difficulty": "Easy",
    "category": "Backtracking & Heaps",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "65.9%",
    "description": "Solve the standard **Last Stone Weight** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "lastStoneWeight",
    "starterCode": {
      "javascript": "function lastStoneWeight(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def lastStoneWeight(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto lastStoneWeight(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "k-closest-points-to-origin",
    "title": "K Closest Points to Origin",
    "slug": "k-closest-points-to-origin",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "66.8%",
    "description": "Solve the standard **K Closest Points to Origin** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "kClosest",
    "starterCode": {
      "javascript": "function kClosest(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def kClosest(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto kClosest(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "kth-largest-element-in-an-array",
    "title": "Kth Largest Element in an Array",
    "slug": "kth-largest-element-in-an-array",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "67.4%",
    "description": "Solve the standard **Kth Largest Element in an Array** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "findKthLargest",
    "starterCode": {
      "javascript": "function findKthLargest(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def findKthLargest(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto findKthLargest(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "task-scheduler",
    "title": "Task Scheduler",
    "slug": "task-scheduler",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "59.3%",
    "description": "Solve the standard **Task Scheduler** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "leastInterval",
    "starterCode": {
      "javascript": "function leastInterval(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def leastInterval(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto leastInterval(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "find-median-from-data-stream",
    "title": "Find Median from Data Stream",
    "slug": "find-median-from-data-stream",
    "difficulty": "Hard",
    "category": "Backtracking & Heaps",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "52.1%",
    "description": "Solve the standard **Find Median from Data Stream** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "MedianFinder",
    "starterCode": {
      "javascript": "function MedianFinder(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def MedianFinder(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto MedianFinder(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "single-number",
    "title": "Single Number",
    "slug": "single-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "73.0%",
    "description": "Solve the standard **Single Number** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "singleNumber",
    "starterCode": {
      "javascript": "function singleNumber(nums) {\n  return nums.reduce((acc, x) => acc ^ x, 0);\n}",
      "python": "class Solution:\n    def singleNumber(self, nums) -> int:\n        res = 0\n        for n in nums: res ^= n\n        return res",
      "cpp": "class Solution {\npublic:\n    int singleNumber(vector<int>& nums) {\n        int res = 0; for (int n : nums) res ^= n; return res;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            2,
            2,
            1
          ]
        ],
        "expected": 1
      },
      {
        "input": [
          [
            4,
            1,
            2,
            1,
            2
          ]
        ],
        "expected": 4
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            2,
            2,
            1
          ]
        ],
        "expected": 1
      },
      {
        "input": [
          [
            4,
            1,
            2,
            1,
            2
          ]
        ],
        "expected": 4
      }
    ]
  },
  {
    "id": "number-of-1-bits",
    "title": "Number of 1 Bits",
    "slug": "number-of-1-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "71.5%",
    "description": "Solve the standard **Number of 1 Bits** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "hammingWeight",
    "starterCode": {
      "javascript": "function hammingWeight(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def hammingWeight(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto hammingWeight(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "counting-bits",
    "title": "Counting Bits",
    "slug": "counting-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "78.3%",
    "description": "Solve the standard **Counting Bits** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "countBits",
    "starterCode": {
      "javascript": "function countBits(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def countBits(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto countBits(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "reverse-bits",
    "title": "Reverse Bits",
    "slug": "reverse-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "58.9%",
    "description": "Solve the standard **Reverse Bits** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "reverseBits",
    "starterCode": {
      "javascript": "function reverseBits(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def reverseBits(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto reverseBits(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "missing-number",
    "title": "Missing Number",
    "slug": "missing-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "66.4%",
    "description": "Solve the standard **Missing Number** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "missingNumber",
    "starterCode": {
      "javascript": "function missingNumber(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def missingNumber(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto missingNumber(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "sum-of-two-integers",
    "title": "Sum of Two Integers",
    "slug": "sum-of-two-integers",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "51.9%",
    "description": "Solve the standard **Sum of Two Integers** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "getSum",
    "starterCode": {
      "javascript": "function getSum(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def getSum(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto getSum(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "reverse-integer",
    "title": "Reverse Integer",
    "slug": "reverse-integer",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "28.9%",
    "description": "Solve the standard **Reverse Integer** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "reverse",
    "starterCode": {
      "javascript": "function reverse(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def reverse(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto reverse(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "palindrome-number",
    "title": "Palindrome Number",
    "slug": "palindrome-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Amazon",
      "Bloomberg",
      "Adobe"
    ],
    "acceptanceRate": "55.6%",
    "description": "Solve the standard **Palindrome Number** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "isPalindrome",
    "starterCode": {
      "javascript": "function isPalindrome(x) {\n  if (x < 0) return false;\n  const s = x.toString();\n  return s === s.split('').reverse().join('');\n}",
      "python": "class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        if x < 0: return False\n        s = str(x)\n        return s == s[::-1]",
      "cpp": "class Solution {\npublic:\n    bool isPalindrome(int x) {\n        if (x < 0) return false;\n        string s = to_string(x), r = s;\n        reverse(r.begin(), r.end());\n        return s == r;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          121
        ],
        "expected": true
      },
      {
        "input": [
          -121
        ],
        "expected": false
      },
      {
        "input": [
          10
        ],
        "expected": false
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          121
        ],
        "expected": true
      },
      {
        "input": [
          -121
        ],
        "expected": false
      },
      {
        "input": [
          10
        ],
        "expected": false
      }
    ]
  },
  {
    "id": "roman-to-integer",
    "title": "Roman to Integer",
    "slug": "roman-to-integer",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Meta",
      "Netflix",
      "ByteDance"
    ],
    "acceptanceRate": "61.4%",
    "description": "Solve the standard **Roman to Integer** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "romanToInt",
    "starterCode": {
      "javascript": "function romanToInt(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def romanToInt(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto romanToInt(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "integer-to-roman",
    "title": "Integer to Roman",
    "slug": "integer-to-roman",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Google",
      "Apple",
      "Microsoft",
      "Amazon"
    ],
    "acceptanceRate": "65.2%",
    "description": "Solve the standard **Integer to Roman** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "intToRoman",
    "starterCode": {
      "javascript": "function intToRoman(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def intToRoman(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto intToRoman(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "powx-n",
    "title": "Pow(x, n)",
    "slug": "powx-n",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Stripe",
      "Airbnb",
      "Salesforce"
    ],
    "acceptanceRate": "34.9%",
    "description": "Solve the standard **Pow(x, n)** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "myPow",
    "starterCode": {
      "javascript": "function myPow(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def myPow(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto myPow(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "sqrtx",
    "title": "Sqrt(x)",
    "slug": "sqrtx",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Oracle",
      "Cisco",
      "PayPal"
    ],
    "acceptanceRate": "39.0%",
    "description": "Solve the standard **Sqrt(x)** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "mySqrt",
    "starterCode": {
      "javascript": "function mySqrt(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def mySqrt(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto mySqrt(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "plus-one",
    "title": "Plus One",
    "slug": "plus-one",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptanceRate": "45.6%",
    "description": "Solve the standard **Plus One** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "plusOne",
    "starterCode": {
      "javascript": "function plusOne(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def plusOne(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto plusOne(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  },
  {
    "id": "add-binary",
    "title": "Add Binary",
    "slug": "add-binary",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [
      "Microsoft",
      "Apple",
      "Uber"
    ],
    "acceptanceRate": "53.9%",
    "description": "Solve the standard **Add Binary** algorithmic challenge.\n\nOptimize your solution for optimal runtime and memory complexity.",
    "constraints": [
      "1 <= n <= 10^5",
      "Runtime limit: 2000 ms",
      "Memory limit: 256 MB"
    ],
    "examples": [
      {
        "input": "Standard problem input",
        "output": "Expected algorithmic output",
        "explanation": "Follows classic DSA paradigm."
      }
    ],
    "functionName": "addBinary",
    "starterCode": {
      "javascript": "function addBinary(input) {\n  // Write your optimal solution here\n  return input;\n}",
      "python": "class Solution:\n    def addBinary(self, input):\n        # Write your optimal solution here\n        return input",
      "cpp": "class Solution {\npublic:\n    auto addBinary(auto input) {\n        return input;\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ],
    "hiddenTestCases": [
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": 6
      }
    ]
  }
];
