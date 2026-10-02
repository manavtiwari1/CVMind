// Auto-generated 110+ Comprehensive DSA Coding Problems for CVMind Code
export interface TestCase {
  input: unknown;
  expected: unknown;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  companies: string[];
  acceptanceRate: string;
  description: string;
  constraints: string[];
  examples: ProblemExample[];
  functionName: string;
  /** Parameter names of the solution function, in order (used to label inputs). */
  params?: string[];
  /** How the judge maps this problem onto a function: used by the server, listed here so the data type-checks. */
  kind?: 'function' | 'design';
  adapter?: string;
  argTypes?: string[];
  returnType?: string;
  compare?: string;
  starterCode: {
    javascript: string;
    python: string;
    cpp: string;
  };
  sampleTestCases: TestCase[];
  hiddenTestCases?: TestCase[];
  hints?: string[];
  isAiGenerated?: boolean;
}

export const CODING_PROBLEMS: CodingProblem[] = [
  {
    "id": "two-sum",
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": ["Google","Amazon","Meta","Apple","Microsoft"],
    "acceptanceRate": "",
    "description": "Given an array of integers `nums` and an integer `target`, return the **indices of the two numbers** that add up to `target`.\n\nYou may assume that each input has **exactly one solution**, and you may not use the same element twice. You can return the two indices in any order.",
    "constraints": ["2 <= nums.length <= 10^4","-10^9 <= nums[i] <= 10^9","-10^9 <= target <= 10^9","Exactly one valid answer exists"],
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "nums[0] + nums[1] = 2 + 7 = 9, so the answer is [0, 1]."
      },
      {
        "input": "nums = [3,2,4], target = 6",
        "output": "[1,2]",
        "explanation": "nums[1] + nums[2] = 2 + 4 = 6."
      }
    ],
    "functionName": "twoSum",
    "params": ["nums","target"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function twoSum(nums, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def twoSum(self, nums, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,7,11,15],9],
        "expected": [0,1]
      },
      {
        "input": [[3,2,4],6],
        "expected": [1,2]
      }
    ]
  },
  {
    "id": "valid-anagram",
    "title": "Valid Anagram",
    "slug": "valid-anagram",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": ["Google","Amazon","Meta","Uber"],
    "acceptanceRate": "",
    "description": "Given two strings `s` and `t`, return `true` if `t` is an **anagram** of `s`, and `false` otherwise.\n\nAn anagram is a word formed by rearranging the letters of another word, using every original letter exactly once.",
    "constraints": ["1 <= s.length, t.length <= 5 * 10^4","s and t consist of lowercase English letters"],
    "examples": [
      {
        "input": "s = \"anagram\", t = \"nagaram\"",
        "output": "true",
        "explanation": "Both words use the same letters the same number of times."
      },
      {
        "input": "s = \"rat\", t = \"car\"",
        "output": "false",
        "explanation": "\"rat\" has no letter \"c\"."
      }
    ],
    "functionName": "isAnagram",
    "params": ["s","t"],
    "starterCode": {
      "javascript": "function isAnagram(s, t) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def isAnagram(self, s, t):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["anagram","nagaram"],
        "expected": true
      },
      {
        "input": ["rat","car"],
        "expected": false
      }
    ]
  },
  {
    "id": "contains-duplicate",
    "title": "Contains Duplicate",
    "slug": "contains-duplicate",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": ["Apple","Microsoft","Adobe"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, return `true` if **any value appears at least twice**, and `false` if every element is distinct.",
    "constraints": ["1 <= nums.length <= 10^5","-10^9 <= nums[i] <= 10^9"],
    "examples": [
      {
        "input": "nums = [1,2,3,1]",
        "output": "true",
        "explanation": "The value 1 appears twice."
      },
      {
        "input": "nums = [1,2,3,4]",
        "output": "false",
        "explanation": "Every element is distinct."
      }
    ],
    "functionName": "containsDuplicate",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function containsDuplicate(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def containsDuplicate(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,1]],
        "expected": true
      },
      {
        "input": [[1,2,3,4]],
        "expected": false
      }
    ]
  },
  {
    "id": "group-anagrams",
    "title": "Group Anagrams",
    "slug": "group-anagrams",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": ["Amazon","Microsoft","Apple","Meta"],
    "acceptanceRate": "",
    "description": "Given an array of strings `strs`, **group the anagrams together**. You may return the groups in any order, and the words inside a group in any order.",
    "constraints": ["1 <= strs.length <= 10^4","0 <= strs[i].length <= 100","strs[i] consists of lowercase English letters"],
    "examples": [
      {
        "input": "strs = [\"a\"]",
        "output": "[[\"a\"]]",
        "explanation": "A single word forms a single group."
      },
      {
        "input": "strs = [\"\"]",
        "output": "[[\"\"]]",
        "explanation": "The empty string forms its own group."
      },
      {
        "input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "output": "[[\"eat\",\"tea\",\"ate\"],[\"tan\",\"nat\"],[\"bat\"]]",
        "explanation": "\"eat\", \"tea\" and \"ate\" are anagrams of each other, and so are \"tan\" and \"nat\"."
      }
    ],
    "functionName": "groupAnagrams",
    "params": ["strs"],
    "compare": "unordered-deep",
    "starterCode": {
      "javascript": "function groupAnagrams(strs) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def groupAnagrams(self, strs):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["a"]],
        "expected": [["a"]]
      },
      {
        "input": [[""]],
        "expected": [[""]]
      },
      {
        "input": [["eat","tea","tan","ate","nat","bat"]],
        "expected": [["eat","tea","ate"],["tan","nat"],["bat"]]
      }
    ]
  },
  {
    "id": "top-k-frequent-elements",
    "title": "Top K Frequent Elements",
    "slug": "top-k-frequent-elements",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": ["Amazon","Facebook","Bloomberg"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums` and an integer `k`, return the **`k` most frequent elements**. You may return the answer in any order.\n\nThe answer is guaranteed to be unique: no other element ties with the `k`th most frequent one.",
    "constraints": ["1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4","1 <= k <= the number of distinct elements in nums","The answer is unique"],
    "examples": [
      {
        "input": "nums = [1,1,1,2,2,3], k = 2",
        "output": "[1,2]",
        "explanation": "1 appears three times and 2 appears twice."
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]",
        "explanation": "Only one element exists."
      }
    ],
    "functionName": "topKFrequent",
    "params": ["nums","k"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function topKFrequent(nums, k) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def topKFrequent(self, nums, k):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,1,1,2,2,3],2],
        "expected": [1,2]
      },
      {
        "input": [[1],1],
        "expected": [1]
      }
    ]
  },
  {
    "id": "product-of-array-except-self",
    "title": "Product of Array Except Self",
    "slug": "product-of-array-except-self",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": ["Amazon","Apple","Asana"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, return an array `answer` where `answer[i]` is the **product of all the elements of `nums` except `nums[i]`**.\n\nYour algorithm must run in **O(n)** time and must not use division.",
    "constraints": ["2 <= nums.length <= 10^5","-30 <= nums[i] <= 30","The product of any prefix or suffix of nums fits in a 32-bit integer"],
    "examples": [
      {
        "input": "nums = [1,2,3,4]",
        "output": "[24,12,8,6]",
        "explanation": "Each output is the product of the other three numbers."
      },
      {
        "input": "nums = [-1,1,0,-3,3]",
        "output": "[0,0,9,0,0]",
        "explanation": "A zero makes every product zero except the one that skips it."
      }
    ],
    "functionName": "productExceptSelf",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function productExceptSelf(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def productExceptSelf(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,4]],
        "expected": [24,12,8,6]
      },
      {
        "input": [[-1,1,0,-3,3]],
        "expected": [0,0,9,0,0]
      }
    ]
  },
  {
    "id": "longest-consecutive-sequence",
    "title": "Longest Consecutive Sequence",
    "slug": "longest-consecutive-sequence",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": ["Google","Microsoft","Spotify"],
    "acceptanceRate": "",
    "description": "Given an unsorted array of integers `nums`, return the **length of the longest run of consecutive integers** that can be formed from its elements.\n\nFor example, the elements `4, 2, 3, 1` form the run `1, 2, 3, 4`. The elements need not be next to each other in the array. Your algorithm must run in **O(n)** time.",
    "constraints": ["0 <= nums.length <= 10^5","-10^9 <= nums[i] <= 10^9"],
    "examples": [
      {
        "input": "nums = [100,4,200,1,3,2]",
        "output": "4",
        "explanation": "The longest run is 1, 2, 3, 4."
      },
      {
        "input": "nums = [0,3,7,2,5,8,4,6,0,1]",
        "output": "9",
        "explanation": "The longest run is 0 through 8."
      }
    ],
    "functionName": "longestConsecutive",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function longestConsecutive(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def longestConsecutive(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[100,4,200,1,3,2]],
        "expected": 4
      },
      {
        "input": [[0,3,7,2,5,8,4,6,0,1]],
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
    "companies": ["Amazon","Apple","LinkedIn"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, find the **contiguous non-empty subarray** with the largest sum and return that sum.",
    "constraints": ["1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "output": "6",
        "explanation": "The subarray [4, -1, 2, 1] has the largest sum, 6."
      },
      {
        "input": "nums = [1]",
        "output": "1",
        "explanation": "A single element is the whole array."
      }
    ],
    "functionName": "maxSubArray",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function maxSubArray(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def maxSubArray(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[-2,1,-3,4,-1,2,1,-5,4]],
        "expected": 6
      },
      {
        "input": [[1]],
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
    "companies": ["Google","Amazon"],
    "acceptanceRate": "",
    "description": "Given an array `nums` of size `n`, return the **majority element**: the element that appears **more than `floor(n / 2)` times**.\n\nYou may assume the majority element always exists in the array.",
    "constraints": ["n == nums.length","1 <= n <= 5 * 10^4","-10^9 <= nums[i] <= 10^9","A majority element always exists"],
    "examples": [
      {
        "input": "nums = [3,2,3]",
        "output": "3",
        "explanation": "3 appears twice out of three."
      },
      {
        "input": "nums = [2,2,1,1,1,2,2]",
        "output": "2",
        "explanation": "2 appears four times out of seven."
      }
    ],
    "functionName": "majorityElement",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function majorityElement(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def majorityElement(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int majorityElement(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,2,3]],
        "expected": 3
      },
      {
        "input": [[2,2,1,1,1,2,2]],
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
    "companies": ["Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "You are given an array `nums` of `n` objects colored red, white or blue, written as the numbers `0`, `1` and `2`.\n\nSort them so that objects of the same color are adjacent, in the order red (0), white (1), blue (2), **without using a library sort function**. Return the sorted array.",
    "constraints": ["n == nums.length","1 <= n <= 300","nums[i] is 0, 1 or 2"],
    "examples": [
      {
        "input": "nums = [2,0,2,1,1,0]",
        "output": "[0,0,1,1,2,2]",
        "explanation": "The zeros come first, then the ones, then the twos."
      },
      {
        "input": "nums = [2,0,1]",
        "output": "[0,1,2]",
        "explanation": "Each color appears once."
      }
    ],
    "functionName": "sortColors",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function sortColors(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def sortColors(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> sortColors(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,0,2,1,1,0]],
        "expected": [0,0,1,1,2,2]
      },
      {
        "input": [[2,0,1]],
        "expected": [0,1,2]
      }
    ]
  },
  {
    "id": "valid-palindrome",
    "title": "Valid Palindrome",
    "slug": "valid-palindrome",
    "difficulty": "Easy",
    "category": "Two Pointers",
    "companies": ["Meta","Microsoft","Uber"],
    "acceptanceRate": "",
    "description": "A phrase is a **palindrome** if, after converting all uppercase letters to lowercase and removing every character that is not a letter or a digit, it reads the same forwards and backwards.\n\nGiven a string `s`, return `true` if it is a palindrome, and `false` otherwise.",
    "constraints": ["1 <= s.length <= 2 * 10^5","s consists only of printable ASCII characters"],
    "examples": [
      {
        "input": "s = \"A man, a plan, a canal: Panama\"",
        "output": "true",
        "explanation": "After cleaning, the phrase is \"amanaplanacanalpanama\", which reads the same in both directions."
      },
      {
        "input": "s = \"race a car\"",
        "output": "false",
        "explanation": "The cleaned phrase \"raceacar\" is not a palindrome."
      }
    ],
    "functionName": "isPalindrome",
    "params": ["s"],
    "starterCode": {
      "javascript": "function isPalindrome(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def isPalindrome(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isPalindrome(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["A man, a plan, a canal: Panama"],
        "expected": true
      },
      {
        "input": ["race a car"],
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
    "companies": ["Amazon","Google"],
    "acceptanceRate": "",
    "description": "Given a **1-indexed** array of integers `numbers` that is already **sorted in non-decreasing order**, find two numbers that add up to `target`.\n\nReturn the **1-based indices** `[index1, index2]` of the two numbers, with `index1 < index2`. Each input has exactly one solution and you may not use the same element twice. Use only **constant extra space**.",
    "constraints": ["2 <= numbers.length <= 3 * 10^4","-1000 <= numbers[i] <= 1000","numbers is sorted in non-decreasing order","-1000 <= target <= 1000","Exactly one solution exists"],
    "examples": [
      {
        "input": "numbers = [2,7,11,15], target = 9",
        "output": "[1,2]",
        "explanation": "2 + 7 = 9, at positions 1 and 2."
      },
      {
        "input": "numbers = [2,3,4], target = 6",
        "output": "[1,3]",
        "explanation": "2 + 4 = 6, at positions 1 and 3."
      }
    ],
    "functionName": "twoSum",
    "params": ["numbers","target"],
    "starterCode": {
      "javascript": "function twoSum(numbers, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def twoSum(self, numbers, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& numbers, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,7,11,15],9],
        "expected": [1,2]
      },
      {
        "input": [[2,3,4],6],
        "expected": [1,3]
      }
    ]
  },
  {
    "id": "3sum",
    "title": "3Sum",
    "slug": "3sum",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": ["Meta","Amazon","Apple"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, return **all the unique triplets** `[nums[i], nums[j], nums[k]]` with `i`, `j` and `k` all different and `nums[i] + nums[j] + nums[k] == 0`.\n\nThe answer must not contain duplicate triplets. You may return the triplets in any order, and the numbers inside a triplet in any order.",
    "constraints": ["3 <= nums.length <= 3000","-10^5 <= nums[i] <= 10^5"],
    "examples": [
      {
        "input": "nums = [0,1,1]",
        "output": "[]",
        "explanation": "No three numbers add up to zero."
      },
      {
        "input": "nums = [0,0,0]",
        "output": "[[0,0,0]]",
        "explanation": "The only triplet is [0, 0, 0]."
      }
    ],
    "functionName": "threeSum",
    "params": ["nums"],
    "compare": "unordered-deep",
    "starterCode": {
      "javascript": "function threeSum(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def threeSum(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[0,1,1]],
        "expected": []
      },
      {
        "input": [[0,0,0]],
        "expected": [[0,0,0]]
      }
    ]
  },
  {
    "id": "container-with-most-water",
    "title": "Container With Most Water",
    "slug": "container-with-most-water",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "You are given an integer array `height` of length `n`. There are `n` vertical lines, where line `i` goes from `(i, 0)` to `(i, height[i])`.\n\nPick two lines that, together with the x-axis, form a container, and return the **maximum amount of water** a container can store. You may not tilt the container.",
    "constraints": ["n == height.length","2 <= n <= 10^5","0 <= height[i] <= 10^4"],
    "examples": [
      {
        "input": "height = [1,8,6,2,5,4,8,3,7]",
        "output": "49",
        "explanation": "The best pair is the line of height 8 (index 1) and the line of height 7 (index 8): min(8, 7) x 7 = 49."
      },
      {
        "input": "height = [1,1]",
        "output": "1",
        "explanation": "Two lines of height 1 that are 1 apart hold 1."
      }
    ],
    "functionName": "maxArea",
    "params": ["height"],
    "starterCode": {
      "javascript": "function maxArea(height) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def maxArea(self, height):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,8,6,2,5,4,8,3,7]],
        "expected": 49
      },
      {
        "input": [[1,1]],
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
    "companies": ["Google","Goldman Sachs","Amazon","Bloomberg"],
    "acceptanceRate": "",
    "description": "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute **how much water it can trap** after raining.",
    "constraints": ["n == height.length","1 <= n <= 2 * 10^4","0 <= height[i] <= 10^5"],
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "output": "6",
        "explanation": "Six units of water are trapped between the bars."
      },
      {
        "input": "height = [4,2,0,3,2,5]",
        "output": "9",
        "explanation": "Nine units are trapped in the wide pit in the middle."
      }
    ],
    "functionName": "trap",
    "params": ["height"],
    "starterCode": {
      "javascript": "function trap(height) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def trap(self, height):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[0,1,0,2,1,0,1,3,2,1,2,1]],
        "expected": 6
      },
      {
        "input": [[4,2,0,3,2,5]],
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
    "companies": ["Meta","Bloomberg"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, **move all the `0`s to the end** while keeping the relative order of the non-zero elements. Return the resulting array.\n\nTry to do it without making a copy of the array.",
    "constraints": ["1 <= nums.length <= 10^4","-2^31 <= nums[i] <= 2^31 - 1"],
    "examples": [
      {
        "input": "nums = [0,1,0,3,12]",
        "output": "[1,3,12,0,0]",
        "explanation": "The non-zero numbers keep their order and the zeros move to the end."
      },
      {
        "input": "nums = [0]",
        "output": "[0]",
        "explanation": "A single zero stays where it is."
      }
    ],
    "functionName": "moveZeroes",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function moveZeroes(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def moveZeroes(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> moveZeroes(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[0,1,0,3,12]],
        "expected": [1,3,12,0,0]
      },
      {
        "input": [[0]],
        "expected": [0]
      }
    ]
  },
  {
    "id": "best-time-to-buy-and-sell-stock",
    "title": "Best Time to Buy and Sell Stock",
    "slug": "best-time-to-buy-and-sell-stock",
    "difficulty": "Easy",
    "category": "Sliding Window",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`.\n\nYou may choose **one day to buy** one share and a **later day to sell** it. Return the maximum profit you can make. If no profit is possible, return `0`.",
    "constraints": ["1 <= prices.length <= 10^5","0 <= prices[i] <= 10^4"],
    "examples": [
      {
        "input": "prices = [7,1,5,3,6,4]",
        "output": "5",
        "explanation": "Buy on day 2 (price 1) and sell on day 5 (price 6): profit = 6 - 1 = 5."
      },
      {
        "input": "prices = [7,6,4,3,1]",
        "output": "0",
        "explanation": "Prices only fall, so no profitable trade exists."
      }
    ],
    "functionName": "maxProfit",
    "params": ["prices"],
    "starterCode": {
      "javascript": "function maxProfit(prices) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def maxProfit(self, prices):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[7,1,5,3,6,4]],
        "expected": 5
      },
      {
        "input": [[7,6,4,3,1]],
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
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Given a string `s`, find the length of the **longest substring** that contains no repeated characters.\n\nA substring is a contiguous run of characters inside the string.",
    "constraints": ["0 <= s.length <= 5 * 10^4","s consists of English letters, digits, symbols and spaces"],
    "examples": [
      {
        "input": "s = \"abcabcbb\"",
        "output": "3",
        "explanation": "The longest such substring is \"abc\", so the answer is 3."
      },
      {
        "input": "s = \"bbbbb\"",
        "output": "1",
        "explanation": "Every character is the same, so the longest substring is a single \"b\"."
      }
    ],
    "functionName": "lengthOfLongestSubstring",
    "params": ["s"],
    "starterCode": {
      "javascript": "function lengthOfLongestSubstring(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def lengthOfLongestSubstring(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["abcabcbb"],
        "expected": 3
      },
      {
        "input": ["bbbbb"],
        "expected": 1
      }
    ]
  },
  {
    "id": "longest-repeating-character-replacement",
    "title": "Longest Repeating Character Replacement",
    "slug": "longest-repeating-character-replacement",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "You are given a string `s` of uppercase English letters and an integer `k`. In one operation you can change any character of `s` into any other uppercase letter. You may perform **at most `k`** operations.\n\nReturn the length of the longest substring made of a single repeated letter that you can obtain.",
    "constraints": ["1 <= s.length <= 10^5","s consists of uppercase English letters","0 <= k <= s.length"],
    "examples": [
      {
        "input": "s = \"ABAB\", k = 2",
        "output": "4",
        "explanation": "Replace the two \"A\"s with \"B\"s (or the other way round) to get \"BBBB\"."
      },
      {
        "input": "s = \"AABABBA\", k = 1",
        "output": "4",
        "explanation": "Replace the \"B\" in the middle to get \"AAAA\"."
      }
    ],
    "functionName": "characterReplacement",
    "params": ["s","k"],
    "starterCode": {
      "javascript": "function characterReplacement(s, k) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def characterReplacement(self, s, k):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int characterReplacement(string s, int k) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["ABAB",2],
        "expected": 4
      },
      {
        "input": ["AABABBA",1],
        "expected": 4
      }
    ]
  },
  {
    "id": "permutation-in-string",
    "title": "Permutation in String",
    "slug": "permutation-in-string",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given two strings `s1` and `s2`, return `true` if `s2` contains a **permutation** of `s1` as a substring, and `false` otherwise.\n\nIn other words, return `true` if some substring of `s2` has exactly the same letters as `s1`, in any order.",
    "constraints": ["1 <= s1.length, s2.length <= 10^4","s1 and s2 consist of lowercase English letters"],
    "examples": [
      {
        "input": "s1 = \"ab\", s2 = \"eidbaooo\"",
        "output": "true",
        "explanation": "\"ba\" is a permutation of \"ab\" and appears in s2."
      },
      {
        "input": "s1 = \"ab\", s2 = \"eidboaoo\"",
        "output": "false",
        "explanation": "No substring of s2 contains exactly one \"a\" and one \"b\" side by side."
      }
    ],
    "functionName": "checkInclusion",
    "params": ["s1","s2"],
    "starterCode": {
      "javascript": "function checkInclusion(s1, s2) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def checkInclusion(self, s1, s2):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool checkInclusion(string s1, string s2) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["ab","eidbaooo"],
        "expected": true
      },
      {
        "input": ["ab","eidboaoo"],
        "expected": false
      }
    ]
  },
  {
    "id": "minimum-window-substring",
    "title": "Minimum Window Substring",
    "slug": "minimum-window-substring",
    "difficulty": "Hard",
    "category": "Sliding Window",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Given two strings `s` and `t`, return the **shortest substring of `s`** that contains every character of `t`, including duplicates. If there is no such substring, return the empty string `\"\"`.\n\nIf several windows share the minimum length, return the one that starts first.",
    "constraints": ["1 <= s.length, t.length <= 10^5","s and t consist of uppercase and lowercase English letters"],
    "examples": [
      {
        "input": "s = \"ADOBECODEBANC\", t = \"ABC\"",
        "output": "\"BANC\"",
        "explanation": "\"BANC\" is the shortest window that contains A, B and C."
      },
      {
        "input": "s = \"a\", t = \"a\"",
        "output": "\"a\"",
        "explanation": "The whole string is the window."
      },
      {
        "input": "s = \"a\", t = \"aa\"",
        "output": "\"\"",
        "explanation": "The single \"a\" cannot cover the two \"a\"s in t, so there is no window."
      }
    ],
    "functionName": "minWindow",
    "params": ["s","t"],
    "starterCode": {
      "javascript": "function minWindow(s, t) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def minWindow(self, s, t):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    string minWindow(string s, string t) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["ADOBECODEBANC","ABC"],
        "expected": "BANC"
      },
      {
        "input": ["a","a"],
        "expected": "a"
      },
      {
        "input": ["a","aa"],
        "expected": ""
      }
    ]
  },
  {
    "id": "sliding-window-maximum",
    "title": "Sliding Window Maximum",
    "slug": "sliding-window-maximum",
    "difficulty": "Hard",
    "category": "Sliding Window",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "You are given an integer array `nums` and a window size `k`. The window starts at the very left of the array and moves one position to the right each step, always covering exactly `k` numbers.\n\nReturn an array containing the **maximum value of the window** at every position.",
    "constraints": ["1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4","1 <= k <= nums.length"],
    "examples": [
      {
        "input": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        "output": "[3,3,5,5,6,7]",
        "explanation": "Window position -> maximum: [1 3 -1] -> 3, [3 -1 -3] -> 3, [-1 -3 5] -> 5, [-3 5 3] -> 5, [5 3 6] -> 6, [3 6 7] -> 7."
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]",
        "explanation": "A single window holds the only element."
      }
    ],
    "functionName": "maxSlidingWindow",
    "params": ["nums","k"],
    "starterCode": {
      "javascript": "function maxSlidingWindow(nums, k) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def maxSlidingWindow(self, nums, k):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,3,-1,-3,5,3,6,7],3],
        "expected": [3,3,5,5,6,7]
      },
      {
        "input": [[1],1],
        "expected": [1]
      }
    ]
  },
  {
    "id": "find-all-anagrams-in-a-string",
    "title": "Find All Anagrams in a String",
    "slug": "find-all-anagrams-in-a-string",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given two strings `s` and `p`, return the **start index of every substring of `s` that is an anagram of `p`**, in increasing order.\n\nAn anagram uses exactly the same letters as the original, in any order.",
    "constraints": ["1 <= s.length, p.length <= 3 * 10^4","s and p consist of lowercase English letters"],
    "examples": [
      {
        "input": "s = \"cbaebabacd\", p = \"abc\"",
        "output": "[0,6]",
        "explanation": "The substring starting at 0 is \"cba\" and the one starting at 6 is \"bac\". Both are anagrams of \"abc\"."
      },
      {
        "input": "s = \"abab\", p = \"ab\"",
        "output": "[0,1,2]",
        "explanation": "Substrings starting at 0, 1 and 2 are \"ab\", \"ba\" and \"ab\"."
      }
    ],
    "functionName": "findAnagrams",
    "params": ["s","p"],
    "starterCode": {
      "javascript": "function findAnagrams(s, p) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def findAnagrams(self, s, p):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> findAnagrams(string s, string p) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["cbaebabacd","abc"],
        "expected": [0,6]
      },
      {
        "input": ["abab","ab"],
        "expected": [0,1,2]
      }
    ]
  },
  {
    "id": "minimum-size-subarray-sum",
    "title": "Minimum Size Subarray Sum",
    "slug": "minimum-size-subarray-sum",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given an array of **positive** integers `nums` and a positive integer `target`, return the **minimal length of a contiguous subarray** whose sum is greater than or equal to `target`.\n\nIf no such subarray exists, return `0`.",
    "constraints": ["1 <= target <= 10^9","1 <= nums.length <= 10^5","1 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "target = 7, nums = [2,3,1,2,4,3]",
        "output": "2",
        "explanation": "The subarray [4, 3] has sum 7 and is the shortest one that reaches the target."
      },
      {
        "input": "target = 4, nums = [1,4,4]",
        "output": "1",
        "explanation": "The single element 4 is enough."
      }
    ],
    "functionName": "minSubArrayLen",
    "params": ["target","nums"],
    "starterCode": {
      "javascript": "function minSubArrayLen(target, nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def minSubArrayLen(self, target, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int minSubArrayLen(int target, vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [7,[2,3,1,2,4,3]],
        "expected": 2
      },
      {
        "input": [4,[1,4,4]],
        "expected": 1
      }
    ]
  },
  {
    "id": "valid-parentheses",
    "title": "Valid Parentheses",
    "slug": "valid-parentheses",
    "difficulty": "Easy",
    "category": "Stack",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Given a string `s` made only of the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, decide whether it is **valid**.\n\nA string is valid when:\n\n- every open bracket is closed by a bracket of the same type, and\n- brackets are closed in the correct order, and\n- every close bracket has a matching open bracket.",
    "constraints": ["1 <= s.length <= 10^4","s consists only of the characters ()[]{}"],
    "examples": [
      {
        "input": "s = \"()\"",
        "output": "true",
        "explanation": "Every bracket is closed in the right order."
      },
      {
        "input": "s = \"()[]{}\"",
        "output": "true",
        "explanation": "Each pair is closed before the next one opens."
      },
      {
        "input": "s = \"(]\"",
        "output": "false",
        "explanation": "The \"]\" does not match the \"(\" that is open."
      }
    ],
    "functionName": "isValid",
    "params": ["s"],
    "starterCode": {
      "javascript": "function isValid(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def isValid(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["()"],
        "expected": true
      },
      {
        "input": ["()[]{}"],
        "expected": true
      },
      {
        "input": ["(]"],
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
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Design a stack that supports `push`, `pop`, `top` and retrieving the **minimum element**, all in **constant time**.\n\nImplement the `MinStack` class:\n\n- `MinStack()` creates an empty stack.\n- `push(val)` pushes `val` onto the stack.\n- `pop()` removes the element on top of the stack.\n- `top()` returns the element on top of the stack.\n- `getMin()` returns the smallest element currently in the stack.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["-2^31 <= val <= 2^31 - 1","pop, top and getMin are always called on a non-empty stack","At most 3 * 10^4 calls are made"],
    "examples": [
      {
        "input": "operations = [\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"], arguments = [[],[-2],[0],[-3],[],[],[],[]]",
        "output": "[null,null,null,null,-3,null,0,-2]",
        "explanation": "After pushing -2, 0 and -3 the minimum is -3. After one pop the top is 0 and the minimum is -2."
      }
    ],
    "functionName": "MinStack",
    "kind": "design",
    "starterCode": {
      "javascript": "class MinStack {\n  constructor() {\n  }\n\n  push(val) {\n  }\n\n  pop() {\n  }\n\n  top() {\n  }\n\n  getMin() {\n  }\n}",
      "python": "class MinStack:\n    def __init__(self):\n        pass\n\n    def push(self, val):\n        pass\n\n    def pop(self):\n        pass\n\n    def top(self):\n        pass\n\n    def getMin(self):\n        pass",
      "cpp": "class MinStack {\npublic:\n    MinStack() {\n    }\n\n    void push(int val) {\n    }\n\n    void pop() {\n    }\n\n    int top() {\n    }\n\n    int getMin() {\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["MinStack","push","push","push","getMin","pop","top","getMin"],[[],[-2],[0],[-3],[],[],[],[]]],
        "expected": [null,null,null,null,-3,null,0,-2]
      }
    ]
  },
  {
    "id": "evaluate-reverse-polish-notation",
    "title": "Evaluate Reverse Polish Notation",
    "slug": "evaluate-reverse-polish-notation",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "You are given an array of strings `tokens` that holds an arithmetic expression in **Reverse Polish Notation** (postfix). Evaluate it and return the result as an integer.\n\n- The valid operators are `+`, `-`, `*` and `/`. Each operand is an integer or another expression.\n- Division between two integers **truncates toward zero**.\n- The expression is always valid, never divides by zero, and every intermediate value fits in a 32-bit integer.",
    "constraints": ["1 <= tokens.length <= 10^4","tokens[i] is an operator or an integer in the range [-200, 200]"],
    "examples": [
      {
        "input": "tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]",
        "output": "9",
        "explanation": "((2 + 1) * 3) = 9"
      },
      {
        "input": "tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]",
        "output": "6",
        "explanation": "(4 + (13 / 5)) = 4 + 2 = 6"
      },
      {
        "input": "tokens = [\"10\",\"6\",\"9\",\"3\",\"+\",\"-11\",\"*\",\"/\",\"*\",\"17\",\"+\",\"5\",\"+\"]",
        "output": "22",
        "explanation": "The expression reduces step by step to 22."
      }
    ],
    "functionName": "evalRPN",
    "params": ["tokens"],
    "starterCode": {
      "javascript": "function evalRPN(tokens) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def evalRPN(self, tokens):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int evalRPN(vector<string>& tokens) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["2","1","+","3","*"]],
        "expected": 9
      },
      {
        "input": [["4","13","5","/","+"]],
        "expected": 6
      },
      {
        "input": [["10","6","9","3","+","-11","*","/","*","17","+","5","+"]],
        "expected": 22
      }
    ]
  },
  {
    "id": "generate-parentheses",
    "title": "Generate Parentheses",
    "slug": "generate-parentheses",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Given `n` pairs of parentheses, return **every well-formed combination** of exactly `n` pairs.\n\nA combination is well-formed when every opening parenthesis is closed in the right order. You may return the combinations in any order.",
    "constraints": ["1 <= n <= 8"],
    "examples": [
      {
        "input": "n = 1",
        "output": "[\"()\"]",
        "explanation": "Only one arrangement exists for a single pair."
      },
      {
        "input": "n = 3",
        "output": "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]",
        "explanation": "There are five well-formed arrangements of three pairs."
      }
    ],
    "functionName": "generateParenthesis",
    "params": ["n"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function generateParenthesis(n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def generateParenthesis(self, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<string> generateParenthesis(int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [1],
        "expected": ["()"]
      },
      {
        "input": [3],
        "expected": ["((()))","(()())","(())()","()(())","()()()"]
      }
    ]
  },
  {
    "id": "daily-temperatures",
    "title": "Daily Temperatures",
    "slug": "daily-temperatures",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "Given an array `temperatures` of daily temperatures, return an array `answer` where `answer[i]` is the **number of days you have to wait after day `i`** to get a warmer temperature.\n\nIf there is no future day with a warmer temperature, `answer[i]` is `0`.",
    "constraints": ["1 <= temperatures.length <= 10^5","30 <= temperatures[i] <= 100"],
    "examples": [
      {
        "input": "temperatures = [73,74,75,71,69,72,76,73]",
        "output": "[1,1,4,2,1,1,0,0]",
        "explanation": "For example, day 0 (73) waits one day for 74, and day 2 (75) waits four days for 76."
      },
      {
        "input": "temperatures = [30,40,50,60]",
        "output": "[1,1,1,0]",
        "explanation": "Every day is followed by a warmer one, except the last."
      }
    ],
    "functionName": "dailyTemperatures",
    "params": ["temperatures"],
    "starterCode": {
      "javascript": "function dailyTemperatures(temperatures) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def dailyTemperatures(self, temperatures):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[73,74,75,71,69,72,76,73]],
        "expected": [1,1,4,2,1,1,0,0]
      },
      {
        "input": [[30,40,50,60]],
        "expected": [1,1,1,0]
      }
    ]
  },
  {
    "id": "car-fleet",
    "title": "Car Fleet",
    "slug": "car-fleet",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "There are `n` cars driving towards a destination that is `target` miles away along a single-lane road. Car `i` starts at `position[i]` and drives at a constant `speed[i]` miles per hour.\n\nA car cannot pass the car in front of it. If it catches up, it slows down and drives at that car's speed, forming a **fleet** with it. Cars that catch up exactly at the destination also count as one fleet.\n\nReturn the number of car fleets that arrive at the destination.",
    "constraints": ["1 <= n <= 10^5","0 < target <= 10^6","0 <= position[i] < target, and all positions are different","0 < speed[i] <= 10^6"],
    "examples": [
      {
        "input": "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]",
        "output": "3",
        "explanation": "The cars starting at 10 and 8 become a fleet that meets at 12. The car at 0 never catches anyone. The cars at 5 and 3 become a fleet that meets at 6. That is 3 fleets."
      },
      {
        "input": "target = 10, position = [3], speed = [3]",
        "output": "1",
        "explanation": "A single car is a single fleet."
      }
    ],
    "functionName": "carFleet",
    "params": ["target","position","speed"],
    "starterCode": {
      "javascript": "function carFleet(target, position, speed) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def carFleet(self, target, position, speed):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int carFleet(int target, vector<int>& position, vector<int>& speed) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [12,[10,8,0,5,3],[2,4,1,1,3]],
        "expected": 3
      },
      {
        "input": [10,[3],[3]],
        "expected": 1
      }
    ]
  },
  {
    "id": "largest-rectangle-in-histogram",
    "title": "Largest Rectangle in Histogram",
    "slug": "largest-rectangle-in-histogram",
    "difficulty": "Hard",
    "category": "Stack",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "You are given an array `heights` representing the heights of the bars of a histogram. Every bar has width `1`.\n\nReturn the **area of the largest rectangle** that fits entirely inside the histogram.",
    "constraints": ["1 <= heights.length <= 10^5","0 <= heights[i] <= 10^4"],
    "examples": [
      {
        "input": "heights = [2,1,5,6,2,3]",
        "output": "10",
        "explanation": "The largest rectangle spans the bars of height 5 and 6 and has area 5 x 2 = 10."
      },
      {
        "input": "heights = [2,4]",
        "output": "4",
        "explanation": "The largest rectangle is a single bar of height 4."
      }
    ],
    "functionName": "largestRectangleArea",
    "params": ["heights"],
    "starterCode": {
      "javascript": "function largestRectangleArea(heights) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def largestRectangleArea(self, heights):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int largestRectangleArea(vector<int>& heights) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,1,5,6,2,3]],
        "expected": 10
      },
      {
        "input": [[2,4]],
        "expected": 4
      }
    ]
  },
  {
    "id": "asteroid-collision",
    "title": "Asteroid Collision",
    "slug": "asteroid-collision",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "You are given an array `asteroids` of integers describing asteroids in a row. The **absolute value** is the asteroid's size and the **sign** is its direction: positive moves right, negative moves left. All asteroids move at the same speed.\n\nAsteroids moving in the same direction never meet. When two asteroids meet, the **smaller one explodes**. If they are the same size, **both explode**.\n\nReturn the state of the asteroids after all collisions.",
    "constraints": ["2 <= asteroids.length <= 10^4","-1000 <= asteroids[i] <= 1000","asteroids[i] != 0"],
    "examples": [
      {
        "input": "asteroids = [5,10,-5]",
        "output": "[5,10]",
        "explanation": "The 10 and -5 meet and the -5 explodes. The 5 and 10 never meet."
      },
      {
        "input": "asteroids = [8,-8]",
        "output": "[]",
        "explanation": "The 8 and -8 have the same size, so both explode."
      },
      {
        "input": "asteroids = [10,2,-5]",
        "output": "[10]",
        "explanation": "The 2 and -5 meet and the 2 explodes, then the 10 and -5 meet and the -5 explodes."
      }
    ],
    "functionName": "asteroidCollision",
    "params": ["asteroids"],
    "starterCode": {
      "javascript": "function asteroidCollision(asteroids) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def asteroidCollision(self, asteroids):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> asteroidCollision(vector<int>& asteroids) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[5,10,-5]],
        "expected": [5,10]
      },
      {
        "input": [[8,-8]],
        "expected": []
      },
      {
        "input": [[10,2,-5]],
        "expected": [10]
      }
    ]
  },
  {
    "id": "binary-search",
    "title": "Binary Search",
    "slug": "binary-search",
    "difficulty": "Easy",
    "category": "Binary Search",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "You are given an array `nums` of integers sorted in **ascending order** and an integer `target`.\n\nReturn the index of `target` in `nums`, or `-1` if it is not present. Your solution must run in **O(log n)** time.",
    "constraints": ["1 <= nums.length <= 10^4","-10^4 < nums[i], target < 10^4","All values in nums are unique and sorted in ascending order"],
    "examples": [
      {
        "input": "nums = [-1,0,3,5,9,12], target = 9",
        "output": "4",
        "explanation": "9 is at index 4."
      },
      {
        "input": "nums = [-1,0,3,5,9,12], target = 2",
        "output": "-1",
        "explanation": "2 is not in the array."
      }
    ],
    "functionName": "search",
    "params": ["nums","target"],
    "starterCode": {
      "javascript": "function search(nums, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def search(self, nums, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[-1,0,3,5,9,12],9],
        "expected": 4
      },
      {
        "input": [[-1,0,3,5,9,12],2],
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
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "You are given an `m x n` integer matrix with two properties:\n\n- each row is sorted in ascending order, and\n- the first integer of each row is greater than the last integer of the previous row.\n\nReturn `true` if `target` is in the matrix and `false` otherwise. Your solution should run in **O(log(m * n))** time.",
    "constraints": ["m == matrix.length, n == matrix[i].length","1 <= m, n <= 100","-10^4 <= matrix[i][j], target <= 10^4"],
    "examples": [
      {
        "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",
        "output": "true",
        "explanation": "3 is in the first row."
      },
      {
        "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13",
        "output": "false",
        "explanation": "13 is not in the matrix."
      }
    ],
    "functionName": "searchMatrix",
    "params": ["matrix","target"],
    "starterCode": {
      "javascript": "function searchMatrix(matrix, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def searchMatrix(self, matrix, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool searchMatrix(vector<vector<int>>& matrix, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,3,5,7],[10,11,16,20],[23,30,34,60]],3],
        "expected": true
      },
      {
        "input": [[[1,3,5,7],[10,11,16,20],[23,30,34,60]],13],
        "expected": false
      }
    ]
  },
  {
    "id": "koko-eating-bananas",
    "title": "Koko Eating Bananas",
    "slug": "koko-eating-bananas",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Koko loves bananas. There are `n` piles, and pile `i` holds `piles[i]` bananas. The guards will be away for `h` hours.\n\nKoko picks an eating speed of `k` bananas per hour. Each hour she chooses one pile and eats up to `k` bananas from it. If the pile has fewer than `k` bananas she eats them all and does nothing else that hour.\n\nReturn the **minimum integer speed `k`** that lets her finish all the bananas within `h` hours.",
    "constraints": ["1 <= piles.length <= 10^4","piles.length <= h <= 10^9","1 <= piles[i] <= 10^9"],
    "examples": [
      {
        "input": "piles = [3,6,7,11], h = 8",
        "output": "4",
        "explanation": "At speed 4 the piles take 1 + 2 + 2 + 3 = 8 hours."
      },
      {
        "input": "piles = [30,11,23,4,20], h = 5",
        "output": "30",
        "explanation": "Only five hours for five piles means she must finish each pile in one hour."
      },
      {
        "input": "piles = [30,11,23,4,20], h = 6",
        "output": "23",
        "explanation": "At speed 23 the piles take 2 + 1 + 1 + 1 + 1 = 6 hours."
      }
    ],
    "functionName": "minEatingSpeed",
    "params": ["piles","h"],
    "starterCode": {
      "javascript": "function minEatingSpeed(piles, h) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def minEatingSpeed(self, piles, h):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int minEatingSpeed(vector<int>& piles, int h) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,6,7,11],8],
        "expected": 4
      },
      {
        "input": [[30,11,23,4,20],5],
        "expected": 30
      },
      {
        "input": [[30,11,23,4,20],6],
        "expected": 23
      }
    ]
  },
  {
    "id": "find-minimum-in-rotated-sorted-array",
    "title": "Find Minimum in Rotated Sorted Array",
    "slug": "find-minimum-in-rotated-sorted-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "An array of **unique** integers that was sorted in ascending order has been **rotated** between 1 and `n` times. For example, `[0,1,2,4,5,6,7]` may become `[4,5,6,7,0,1,2]`.\n\nReturn the **minimum element** of the rotated array. Your solution must run in **O(log n)** time.",
    "constraints": ["1 <= nums.length <= 5000","-5000 <= nums[i] <= 5000","All integers of nums are unique","nums is sorted and rotated between 1 and n times"],
    "examples": [
      {
        "input": "nums = [3,4,5,1,2]",
        "output": "1",
        "explanation": "The original array was [1,2,3,4,5], rotated 3 times."
      },
      {
        "input": "nums = [4,5,6,7,0,1,2]",
        "output": "0",
        "explanation": "The original array was [0,1,2,4,5,6,7], rotated 4 times."
      },
      {
        "input": "nums = [11,13,15,17]",
        "output": "11",
        "explanation": "The array was rotated 4 times, which leaves it unchanged."
      }
    ],
    "functionName": "findMin",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function findMin(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def findMin(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,4,5,1,2]],
        "expected": 1
      },
      {
        "input": [[4,5,6,7,0,1,2]],
        "expected": 0
      },
      {
        "input": [[11,13,15,17]],
        "expected": 11
      }
    ]
  },
  {
    "id": "search-in-rotated-sorted-array",
    "title": "Search in Rotated Sorted Array",
    "slug": "search-in-rotated-sorted-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "An array of **distinct** integers that was sorted in ascending order has been rotated at an unknown pivot. For example, `[0,1,2,4,5,6,7]` may become `[4,5,6,7,0,1,2]`.\n\nGiven the rotated array `nums` and an integer `target`, return the index of `target`, or `-1` if it is not in the array. Your solution must run in **O(log n)** time.",
    "constraints": ["1 <= nums.length <= 5000","-10^4 <= nums[i] <= 10^4","All values of nums are unique","-10^4 <= target <= 10^4"],
    "examples": [
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 0",
        "output": "4",
        "explanation": "0 is at index 4."
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 3",
        "output": "-1",
        "explanation": "3 is not in the array."
      },
      {
        "input": "nums = [1], target = 0",
        "output": "-1",
        "explanation": "The array has one element and it is not 0."
      }
    ],
    "functionName": "search",
    "params": ["nums","target"],
    "starterCode": {
      "javascript": "function search(nums, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def search(self, nums, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[4,5,6,7,0,1,2],0],
        "expected": 4
      },
      {
        "input": [[4,5,6,7,0,1,2],3],
        "expected": -1
      },
      {
        "input": [[1],0],
        "expected": -1
      }
    ]
  },
  {
    "id": "time-based-key-value-store",
    "title": "Time Based Key-Value Store",
    "slug": "time-based-key-value-store",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Design a key-value store that keeps **multiple values for the same key at different timestamps** and can return the value a key had at a given time.\n\nImplement the `TimeMap` class:\n\n- `TimeMap()` creates the store.\n- `set(key, value, timestamp)` stores `value` for `key` at the given `timestamp`.\n- `get(key, timestamp)` returns the value that was set with the **largest timestamp that is less than or equal to** the requested one. If there is no such value, it returns `\"\"`.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["1 <= key.length, value.length <= 100","key and value consist of lowercase letters and digits","1 <= timestamp <= 10^7","All timestamps passed to set for the same key are strictly increasing","At most 2 * 10^5 calls are made"],
    "examples": [
      {
        "input": "operations = [\"TimeMap\",\"set\",\"get\",\"get\",\"set\",\"get\",\"get\"], arguments = [[],[\"foo\",\"bar\",1],[\"foo\",1],[\"foo\",3],[\"foo\",\"bar2\",4],[\"foo\",4],[\"foo\",5]]",
        "output": "[null,null,\"bar\",\"bar\",null,\"bar2\",\"bar2\"]",
        "explanation": "The value set at time 1 is returned for times 1 and 3. After \"bar2\" is set at time 4, it is returned for times 4 and 5."
      }
    ],
    "functionName": "TimeMap",
    "kind": "design",
    "starterCode": {
      "javascript": "class TimeMap {\n  constructor() {\n  }\n\n  set(key, value, timestamp) {\n  }\n\n  get(key, timestamp) {\n  }\n}",
      "python": "class TimeMap:\n    def __init__(self):\n        pass\n\n    def set(self, key, value, timestamp):\n        pass\n\n    def get(self, key, timestamp):\n        pass",
      "cpp": "class TimeMap {\npublic:\n    TimeMap() {\n    }\n\n    void set(string key, string value, int timestamp) {\n    }\n\n    string get(string key, int timestamp) {\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["TimeMap","set","get","get","set","get","get"],[[],["foo","bar",1],["foo",1],["foo",3],["foo","bar2",4],["foo",4],["foo",5]]],
        "expected": [null,null,"bar","bar",null,"bar2","bar2"]
      }
    ]
  },
  {
    "id": "median-of-two-sorted-arrays",
    "title": "Median of Two Sorted Arrays",
    "slug": "median-of-two-sorted-arrays",
    "difficulty": "Hard",
    "category": "Binary Search",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "You are given two sorted arrays `nums1` and `nums2` of sizes `m` and `n`. Return the **median** of the two arrays combined.\n\nThe median is the middle value of the sorted combined values, or the average of the two middle values when the total count is even. The overall run time should be **O(log(m + n))**.",
    "constraints": ["0 <= m, n <= 1000","1 <= m + n <= 2000","-10^6 <= nums1[i], nums2[i] <= 10^6"],
    "examples": [
      {
        "input": "nums1 = [1,3], nums2 = [2]",
        "output": "2",
        "explanation": "Merged array = [1,2,3] and the median is 2."
      },
      {
        "input": "nums1 = [1,2], nums2 = [3,4]",
        "output": "2.5",
        "explanation": "Merged array = [1,2,3,4] and the median is (2 + 3) / 2 = 2.5."
      }
    ],
    "functionName": "findMedianSortedArrays",
    "params": ["nums1","nums2"],
    "compare": "float",
    "starterCode": {
      "javascript": "function findMedianSortedArrays(nums1, nums2) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def findMedianSortedArrays(self, nums1, nums2):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,3],[2]],
        "expected": 2
      },
      {
        "input": [[1,2],[3,4]],
        "expected": 2.5
      }
    ]
  },
  {
    "id": "peak-index-in-a-mountain-array",
    "title": "Peak Index in a Mountain Array",
    "slug": "peak-index-in-a-mountain-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "An array `arr` is a **mountain** if its length is at least 3 and there is an index `i` with `0 < i < arr.length - 1` such that\n\n- `arr[0] < arr[1] < ... < arr[i]`, and\n- `arr[i] > arr[i + 1] > ... > arr[arr.length - 1]`.\n\nGiven a mountain array, return the index `i` of its peak. Your solution must run in **O(log n)** time.",
    "constraints": ["3 <= arr.length <= 10^5","0 <= arr[i] <= 10^6","arr is guaranteed to be a mountain array"],
    "examples": [
      {
        "input": "arr = [0,1,0]",
        "output": "1",
        "explanation": "The peak is 1 at index 1."
      },
      {
        "input": "arr = [0,2,1,0]",
        "output": "1",
        "explanation": "The peak is 2 at index 1."
      }
    ],
    "functionName": "peakIndexInMountainArray",
    "params": ["arr"],
    "starterCode": {
      "javascript": "function peakIndexInMountainArray(arr) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def peakIndexInMountainArray(self, arr):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int peakIndexInMountainArray(vector<int>& arr) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[0,1,0]],
        "expected": 1
      },
      {
        "input": [[0,2,1,0]],
        "expected": 1
      }
    ]
  },
  {
    "id": "reverse-linked-list",
    "title": "Reverse Linked List",
    "slug": "reverse-linked-list",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given the head of a singly linked list, **reverse the list** and return the new head.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The number of nodes is in the range [0, 5000]","-5000 <= Node.val <= 5000"],
    "examples": [
      {
        "input": "head = [1,2,3,4,5]",
        "output": "[5,4,3,2,1]",
        "explanation": "The list 1 -> 2 -> 3 -> 4 -> 5 becomes 5 -> 4 -> 3 -> 2 -> 1."
      },
      {
        "input": "head = [1,2]",
        "output": "[2,1]",
        "explanation": "Two nodes swap places."
      },
      {
        "input": "head = []",
        "output": "[]",
        "explanation": "An empty list stays empty."
      }
    ],
    "functionName": "reverseList",
    "params": ["head"],
    "argTypes": ["list"],
    "returnType": "list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction reverseList(head) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def reverseList(self, head):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,4,5]],
        "expected": [5,4,3,2,1]
      },
      {
        "input": [[1,2]],
        "expected": [2,1]
      },
      {
        "input": [[]],
        "expected": []
      }
    ]
  },
  {
    "id": "merge-two-sorted-lists",
    "title": "Merge Two Sorted Lists",
    "slug": "merge-two-sorted-lists",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "You are given the heads of two **sorted** linked lists, `list1` and `list2`. Merge them into one sorted list by splicing together the nodes of the two lists, and return the head of the merged list.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The number of nodes in each list is in the range [0, 50]","-100 <= Node.val <= 100","Both lists are sorted in non-decreasing order"],
    "examples": [
      {
        "input": "list1 = [1,2,4], list2 = [1,3,4]",
        "output": "[1,1,2,3,4,4]",
        "explanation": "Merging the two lists gives 1 -> 1 -> 2 -> 3 -> 4 -> 4."
      },
      {
        "input": "list1 = [], list2 = []",
        "output": "[]",
        "explanation": "Both lists are empty."
      },
      {
        "input": "list1 = [], list2 = [0]",
        "output": "[0]",
        "explanation": "One list is empty, so the result is the other one."
      }
    ],
    "functionName": "mergeTwoLists",
    "params": ["list1","list2"],
    "argTypes": ["list","list"],
    "returnType": "list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction mergeTwoLists(list1, list2) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def mergeTwoLists(self, list1, list2):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,4],[1,3,4]],
        "expected": [1,1,2,3,4,4]
      },
      {
        "input": [[],[]],
        "expected": []
      },
      {
        "input": [[],[0]],
        "expected": [0]
      }
    ]
  },
  {
    "id": "reorder-list",
    "title": "Reorder List",
    "slug": "reorder-list",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "You are given the head of a singly linked list `L0 -> L1 -> ... -> Ln-1 -> Ln`. **Reorder** it into the form\n\n`L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 -> ...`\n\nYou may not change the values in the nodes; only the nodes themselves may be rearranged. Return the head of the reordered list.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The number of nodes is in the range [1, 5 * 10^4]","1 <= Node.val <= 1000"],
    "examples": [
      {
        "input": "head = [1,2,3,4]",
        "output": "[1,4,2,3]",
        "explanation": "The last node goes after the first, the second to last after the second."
      },
      {
        "input": "head = [1,2,3,4,5]",
        "output": "[1,5,2,4,3]",
        "explanation": "The middle node stays in the middle."
      }
    ],
    "functionName": "reorderList",
    "params": ["head"],
    "argTypes": ["list"],
    "returnType": "list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction reorderList(head) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def reorderList(self, head):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    ListNode* reorderList(ListNode* head) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,4]],
        "expected": [1,4,2,3]
      },
      {
        "input": [[1,2,3,4,5]],
        "expected": [1,5,2,4,3]
      }
    ]
  },
  {
    "id": "remove-nth-node-from-end-of-list",
    "title": "Remove Nth Node From End of List",
    "slug": "remove-nth-node-from-end-of-list",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given the head of a linked list and an integer `n`, **remove the `n`th node from the end** of the list and return the head.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The number of nodes is sz, with 1 <= sz <= 30","0 <= Node.val <= 100","1 <= n <= sz"],
    "examples": [
      {
        "input": "head = [1,2,3,4,5], n = 2",
        "output": "[1,2,3,5]",
        "explanation": "The second node from the end is 4, so it is removed."
      },
      {
        "input": "head = [1], n = 1",
        "output": "[]",
        "explanation": "The only node is removed and the list becomes empty."
      },
      {
        "input": "head = [1,2], n = 1",
        "output": "[1]",
        "explanation": "The last node is removed."
      }
    ],
    "functionName": "removeNthFromEnd",
    "params": ["head","n"],
    "argTypes": ["list"],
    "returnType": "list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction removeNthFromEnd(head, n) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def removeNthFromEnd(self, head, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    ListNode* removeNthFromEnd(ListNode* head, int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,4,5],2],
        "expected": [1,2,3,5]
      },
      {
        "input": [[1],1],
        "expected": []
      },
      {
        "input": [[1,2],1],
        "expected": [1]
      }
    ]
  },
  {
    "id": "add-two-numbers",
    "title": "Add Two Numbers",
    "slug": "add-two-numbers",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in **reverse order**, so the head holds the ones digit, and each node holds a single digit.\n\nAdd the two numbers and return the sum as a linked list in the same format. The numbers have no leading zeros, except for the number 0 itself.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The number of nodes in each list is in the range [1, 100]","0 <= Node.val <= 9","The lists represent numbers without leading zeros"],
    "examples": [
      {
        "input": "l1 = [2,4,3], l2 = [5,6,4]",
        "output": "[7,0,8]",
        "explanation": "342 + 465 = 807."
      },
      {
        "input": "l1 = [0], l2 = [0]",
        "output": "[0]",
        "explanation": "0 + 0 = 0."
      },
      {
        "input": "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]",
        "output": "[8,9,9,9,0,0,0,1]",
        "explanation": "9999999 + 9999 = 10009998."
      }
    ],
    "functionName": "addTwoNumbers",
    "params": ["l1","l2"],
    "argTypes": ["list","list"],
    "returnType": "list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction addTwoNumbers(l1, l2) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def addTwoNumbers(self, l1, l2):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,4,3],[5,6,4]],
        "expected": [7,0,8]
      },
      {
        "input": [[0],[0]],
        "expected": [0]
      },
      {
        "input": [[9,9,9,9,9,9,9],[9,9,9,9]],
        "expected": [8,9,9,9,0,0,0,1]
      }
    ]
  },
  {
    "id": "linked-list-cycle",
    "title": "Linked List Cycle",
    "slug": "linked-list-cycle",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Given `head`, the head of a linked list, determine whether the list has a **cycle**: a node that can be reached again by following `next` pointers.\n\nThe judge builds the list from the `head` array and connects the tail to the node at index `pos`, or leaves it unconnected when `pos` is `-1`. Your function only receives the head node and must not depend on `pos`. Return `true` if there is a cycle, otherwise `false`.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The number of nodes is in the range [0, 10^4]","-10^5 <= Node.val <= 10^5","pos is -1 or a valid index of the list"],
    "examples": [
      {
        "input": "head = [3,2,0,-4], pos = 1",
        "output": "true",
        "explanation": "The tail connects back to the node at index 1."
      },
      {
        "input": "head = [1,2], pos = 0",
        "output": "true",
        "explanation": "The tail connects back to the node at index 0."
      },
      {
        "input": "head = [1], pos = -1",
        "output": "false",
        "explanation": "There is a single node and it points to nothing."
      }
    ],
    "functionName": "hasCycle",
    "params": ["head"],
    "adapter": "cyclic-list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction hasCycle(head) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def hasCycle(self, head):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool hasCycle(ListNode* head) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,2,0,-4],1],
        "expected": true
      },
      {
        "input": [[1,2],0],
        "expected": true
      },
      {
        "input": [[1],-1],
        "expected": false
      }
    ]
  },
  {
    "id": "find-the-duplicate-number",
    "title": "Find the Duplicate Number",
    "slug": "find-the-duplicate-number",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "You are given an array `nums` of `n + 1` integers where every integer is in the range `[1, n]`. There is **exactly one repeated number**, although it may appear more than twice.\n\nReturn the repeated number. Try to solve it **without modifying `nums`** and using only constant extra space.",
    "constraints": ["1 <= n <= 10^5","nums.length == n + 1","1 <= nums[i] <= n","Exactly one integer appears two or more times; every other integer appears once"],
    "examples": [
      {
        "input": "nums = [1,3,4,2,2]",
        "output": "2",
        "explanation": "2 appears twice."
      },
      {
        "input": "nums = [3,1,3,4,2]",
        "output": "3",
        "explanation": "3 appears twice."
      },
      {
        "input": "nums = [3,3,3,3,3]",
        "output": "3",
        "explanation": "3 fills the whole array."
      }
    ],
    "functionName": "findDuplicate",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function findDuplicate(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def findDuplicate(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int findDuplicate(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,3,4,2,2]],
        "expected": 2
      },
      {
        "input": [[3,1,3,4,2]],
        "expected": 3
      },
      {
        "input": [[3,3,3,3,3]],
        "expected": 3
      }
    ]
  },
  {
    "id": "lru-cache",
    "title": "LRU Cache",
    "slug": "lru-cache",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Design a data structure that follows the rules of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n\n- `LRUCache(capacity)` creates a cache that holds at most `capacity` entries.\n- `get(key)` returns the value of `key` if it is in the cache, otherwise `-1`. A successful `get` makes the key the most recently used one.\n- `put(key, value)` inserts or updates the value. If the cache is already full, it first evicts the **least recently used** key. An update also makes the key the most recently used one.\n\nBoth `get` and `put` must run in **O(1)** average time.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["1 <= capacity <= 3000","0 <= key <= 10^4","0 <= value <= 10^5","At most 2 * 10^5 calls are made"],
    "examples": [
      {
        "input": "operations = [\"LRUCache\",\"put\",\"put\",\"get\",\"put\",\"get\",\"put\",\"get\",\"get\",\"get\"], arguments = [[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]",
        "output": "[null,null,null,1,null,-1,null,-1,3,4]",
        "explanation": "After put(1), put(2) and get(1), key 2 is least recently used. Adding key 3 evicts 2, so get(2) is -1. Adding key 4 then evicts 1."
      }
    ],
    "functionName": "LRUCache",
    "kind": "design",
    "starterCode": {
      "javascript": "class LRUCache {\n  constructor(capacity) {\n  }\n\n  get(key) {\n  }\n\n  put(key, value) {\n  }\n}",
      "python": "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass",
      "cpp": "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n    }\n\n    int get(int key) {\n    }\n\n    void put(int key, int value) {\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["LRUCache","put","put","get","put","get","put","get","get","get"],[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]],
        "expected": [null,null,null,1,null,-1,null,-1,3,4]
      }
    ]
  },
  {
    "id": "merge-k-sorted-lists",
    "title": "Merge k Sorted Lists",
    "slug": "merge-k-sorted-lists",
    "difficulty": "Hard",
    "category": "Linked List",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "You are given an array of `k` linked lists `lists`, each sorted in ascending order. **Merge all the lists into one sorted linked list** and return its head.\n\nEvery list in `lists` is given as an array of node values; your function receives an array of head nodes (an empty list is `null`).\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["k == lists.length","0 <= k <= 10^4","0 <= lists[i].length <= 500","-10^4 <= lists[i][j] <= 10^4","Each lists[i] is sorted in ascending order","The total number of nodes does not exceed 10^4"],
    "examples": [
      {
        "input": "lists = [[1,4,5],[1,3,4],[2,6]]",
        "output": "[1,1,2,3,4,4,5,6]",
        "explanation": "Merging the three lists gives 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6."
      },
      {
        "input": "lists = []",
        "output": "[]",
        "explanation": "There are no lists."
      },
      {
        "input": "lists = [[]]",
        "output": "[]",
        "explanation": "The only list is empty."
      }
    ],
    "functionName": "mergeKLists",
    "params": ["lists"],
    "argTypes": ["lists"],
    "returnType": "list",
    "starterCode": {
      "javascript": "/**\n * function ListNode(val, next) {\n *   this.val = val === undefined ? 0 : val;\n *   this.next = next === undefined ? null : next;\n * }\n */\nfunction mergeKLists(lists) {\n  // Write your solution here\n}",
      "python": "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def mergeKLists(self, lists):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,4,5],[1,3,4],[2,6]]],
        "expected": [1,1,2,3,4,4,5,6]
      },
      {
        "input": [[]],
        "expected": []
      },
      {
        "input": [[[]]],
        "expected": []
      }
    ]
  },
  {
    "id": "invert-binary-tree",
    "title": "Invert Binary Tree",
    "slug": "invert-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given the root of a binary tree, **invert the tree** (swap the left and right child of every node) and return its root.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [0, 100]","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [4,2,7,1,3,6,9]",
        "output": "[4,7,2,9,6,3,1]",
        "explanation": "Every node swaps its children."
      },
      {
        "input": "root = [2,1,3]",
        "output": "[2,3,1]",
        "explanation": "The two children of the root swap."
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "An empty tree stays empty."
      }
    ],
    "functionName": "invertTree",
    "params": ["root"],
    "argTypes": ["tree"],
    "returnType": "tree",
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction invertTree(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def invertTree(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    TreeNode* invertTree(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[4,2,7,1,3,6,9]],
        "expected": [4,7,2,9,6,3,1]
      },
      {
        "input": [[2,1,3]],
        "expected": [2,3,1]
      },
      {
        "input": [[]],
        "expected": []
      }
    ]
  },
  {
    "id": "maximum-depth-of-binary-tree",
    "title": "Maximum Depth of Binary Tree",
    "slug": "maximum-depth-of-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given the root of a binary tree, return its **maximum depth**: the number of nodes along the longest path from the root down to the farthest leaf.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [0, 10^4]","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "3",
        "explanation": "The longest path is 3 -> 20 -> 15 (or 7), which has 3 nodes."
      },
      {
        "input": "root = [1,null,2]",
        "output": "2",
        "explanation": "The longest path is 1 -> 2, which has 2 nodes."
      }
    ],
    "functionName": "maxDepth",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction maxDepth(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def maxDepth(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,9,20,null,null,15,7]],
        "expected": 3
      },
      {
        "input": [[1,null,2]],
        "expected": 2
      }
    ]
  },
  {
    "id": "diameter-of-binary-tree",
    "title": "Diameter of Binary Tree",
    "slug": "diameter-of-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Given the root of a binary tree, return the length of its **diameter**: the number of **edges** on the longest path between any two nodes. The path may or may not pass through the root.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [1, 10^4]","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [1,2,3,4,5]",
        "output": "3",
        "explanation": "The longest path is 4 -> 2 -> 1 -> 3 (or 5 -> 2 -> 1 -> 3), which has 3 edges."
      },
      {
        "input": "root = [1,2]",
        "output": "1",
        "explanation": "The two nodes are joined by a single edge."
      }
    ],
    "functionName": "diameterOfBinaryTree",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction diameterOfBinaryTree(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def diameterOfBinaryTree(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int diameterOfBinaryTree(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,4,5]],
        "expected": 3
      },
      {
        "input": [[1,2]],
        "expected": 1
      }
    ]
  },
  {
    "id": "balanced-binary-tree",
    "title": "Balanced Binary Tree",
    "slug": "balanced-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Given the root of a binary tree, determine whether it is **height-balanced**: for every node, the heights of its left and right subtrees differ by **at most one**.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [0, 5000]","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "true",
        "explanation": "Every node is balanced."
      },
      {
        "input": "root = [1,2,2,3,3,null,null,4,4]",
        "output": "false",
        "explanation": "At the root, the left subtree is two levels taller than the right subtree, so the tree is not balanced."
      },
      {
        "input": "root = []",
        "output": "true",
        "explanation": "An empty tree is balanced."
      }
    ],
    "functionName": "isBalanced",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction isBalanced(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def isBalanced(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isBalanced(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,9,20,null,null,15,7]],
        "expected": true
      },
      {
        "input": [[1,2,2,3,3,null,null,4,4]],
        "expected": false
      },
      {
        "input": [[]],
        "expected": true
      }
    ]
  },
  {
    "id": "same-tree",
    "title": "Same Tree",
    "slug": "same-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given the roots of two binary trees `p` and `q`, return `true` if they are the **same tree**: they have the same structure and every pair of corresponding nodes holds the same value.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes in both trees is in the range [0, 100]","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "p = [1,2,3], q = [1,2,3]",
        "output": "true",
        "explanation": "Both trees are identical."
      },
      {
        "input": "p = [1,2], q = [1,null,2]",
        "output": "false",
        "explanation": "The second tree has its child on the other side, so the structures differ."
      },
      {
        "input": "p = [1,2,1], q = [1,1,2]",
        "output": "false",
        "explanation": "The values of the two leaves are swapped."
      }
    ],
    "functionName": "isSameTree",
    "params": ["p","q"],
    "argTypes": ["tree","tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction isSameTree(p, q) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def isSameTree(self, p, q):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isSameTree(TreeNode* p, TreeNode* q) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3],[1,2,3]],
        "expected": true
      },
      {
        "input": [[1,2],[1,null,2]],
        "expected": false
      },
      {
        "input": [[1,2,1],[1,1,2]],
        "expected": false
      }
    ]
  },
  {
    "id": "subtree-of-another-tree",
    "title": "Subtree of Another Tree",
    "slug": "subtree-of-another-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a node in `root` whose subtree has **exactly the same structure and node values** as `subRoot`, and `false` otherwise.\n\nA subtree of a tree is a node together with all of its descendants.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes in root is in the range [1, 2000]","The number of nodes in subRoot is in the range [1, 1000]","-10^4 <= root.val, subRoot.val <= 10^4"],
    "examples": [
      {
        "input": "root = [3,4,5,1,2], subRoot = [4,1,2]",
        "output": "true",
        "explanation": "The subtree rooted at 4 matches subRoot."
      },
      {
        "input": "root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]",
        "output": "false",
        "explanation": "The subtree rooted at 4 has an extra node 0, so it does not match."
      }
    ],
    "functionName": "isSubtree",
    "params": ["root","subRoot"],
    "argTypes": ["tree","tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction isSubtree(root, subRoot) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def isSubtree(self, root, subRoot):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isSubtree(TreeNode* root, TreeNode* subRoot) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,4,5,1,2],[4,1,2]],
        "expected": true
      },
      {
        "input": [[3,4,5,1,2,null,null,null,null,0],[4,1,2]],
        "expected": false
      }
    ]
  },
  {
    "id": "lowest-common-ancestor-of-a-bst",
    "title": "Lowest Common Ancestor of a BST",
    "slug": "lowest-common-ancestor-of-a-bst",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "Given a **binary search tree** and two values `p` and `q` that are present in it, return the **value of their lowest common ancestor** (LCA).\n\nThe LCA of two nodes is the lowest node that has both of them as descendants, where a node may be a descendant of itself.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [2, 10^5]","-10^9 <= Node.val <= 10^9","All Node.val are unique","p != q, and both p and q exist in the BST"],
    "examples": [
      {
        "input": "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8",
        "output": "6",
        "explanation": "The LCA of 2 and 8 is 6."
      },
      {
        "input": "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4",
        "output": "2",
        "explanation": "The LCA of 2 and 4 is 2, because a node can be its own descendant."
      },
      {
        "input": "root = [2,1], p = 2, q = 1",
        "output": "2",
        "explanation": "The LCA of 2 and 1 is 2."
      }
    ],
    "functionName": "lowestCommonAncestor",
    "params": ["root","p","q"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction lowestCommonAncestor(root, p, q) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int lowestCommonAncestor(TreeNode* root, int p, int q) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[6,2,8,0,4,7,9,null,null,3,5],2,8],
        "expected": 6
      },
      {
        "input": [[6,2,8,0,4,7,9,null,null,3,5],2,4],
        "expected": 2
      },
      {
        "input": [[2,1],2,1],
        "expected": 2
      }
    ]
  },
  {
    "id": "binary-tree-level-order-traversal",
    "title": "Binary Tree Level Order Traversal",
    "slug": "binary-tree-level-order-traversal",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given the root of a binary tree, return the **level-order traversal** of its nodes' values: from left to right, level by level, as an array of arrays.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [0, 2000]","-1000 <= Node.val <= 1000"],
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "[[3],[9,20],[15,7]]",
        "explanation": "Level 0 is [3], level 1 is [9, 20] and level 2 is [15, 7]."
      },
      {
        "input": "root = [1]",
        "output": "[[1]]",
        "explanation": "A single node gives a single level."
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "An empty tree has no levels."
      }
    ],
    "functionName": "levelOrder",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction levelOrder(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def levelOrder(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,9,20,null,null,15,7]],
        "expected": [[3],[9,20],[15,7]]
      },
      {
        "input": [[1]],
        "expected": [[1]]
      },
      {
        "input": [[]],
        "expected": []
      }
    ]
  },
  {
    "id": "binary-tree-right-side-view",
    "title": "Binary Tree Right Side View",
    "slug": "binary-tree-right-side-view",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Imagine standing on the **right side** of a binary tree. Return the values of the nodes you can see, ordered from top to bottom.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [0, 100]","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [1,2,3,null,5,null,4]",
        "output": "[1,3,4]",
        "explanation": "From the right you see 1, then 3, then 4."
      },
      {
        "input": "root = [1,null,3]",
        "output": "[1,3]",
        "explanation": "You see 1 and 3."
      }
    ],
    "functionName": "rightSideView",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction rightSideView(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def rightSideView(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> rightSideView(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,null,5,null,4]],
        "expected": [1,3,4]
      },
      {
        "input": [[1,null,3]],
        "expected": [1,3]
      }
    ]
  },
  {
    "id": "count-good-nodes-in-binary-tree",
    "title": "Count Good Nodes in Binary Tree",
    "slug": "count-good-nodes-in-binary-tree",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "In a binary tree, a node `X` is **good** if no node on the path from the root to `X` has a value greater than `X`'s value.\n\nGiven the root of a binary tree, return the number of good nodes.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [1, 10^5]","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [3,1,4,3,null,1,5]",
        "output": "4",
        "explanation": "The good nodes are 3 (the root), 4, 5 and the 3 below the 1."
      },
      {
        "input": "root = [3,3,null,4,2]",
        "output": "3",
        "explanation": "The good nodes are 3 (the root), 3 and 4."
      },
      {
        "input": "root = [1]",
        "output": "1",
        "explanation": "The root is always good."
      }
    ],
    "functionName": "goodNodes",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction goodNodes(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def goodNodes(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int goodNodes(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,1,4,3,null,1,5]],
        "expected": 4
      },
      {
        "input": [[3,3,null,4,2]],
        "expected": 3
      },
      {
        "input": [[1]],
        "expected": 1
      }
    ]
  },
  {
    "id": "validate-binary-search-tree",
    "title": "Validate Binary Search Tree",
    "slug": "validate-binary-search-tree",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Given the root of a binary tree, determine whether it is a **valid binary search tree** (BST).\n\nIn a valid BST, for every node:\n\n- all values in its **left** subtree are **strictly less** than the node's value,\n- all values in its **right** subtree are **strictly greater** than the node's value, and\n- both subtrees are themselves valid BSTs.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is in the range [1, 10^4]","-2^31 <= Node.val <= 2^31 - 1"],
    "examples": [
      {
        "input": "root = [2,1,3]",
        "output": "true",
        "explanation": "Every node respects the ordering."
      },
      {
        "input": "root = [5,1,4,null,null,3,6]",
        "output": "false",
        "explanation": "The root is 5, but its right child 4 is smaller than 5, so the tree is not a BST."
      }
    ],
    "functionName": "isValidBST",
    "params": ["root"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction isValidBST(root) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def isValidBST(self, root):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,1,3]],
        "expected": true
      },
      {
        "input": [[5,1,4,null,null,3,6]],
        "expected": false
      }
    ]
  },
  {
    "id": "kth-smallest-element-in-a-bst",
    "title": "Kth Smallest Element in a BST",
    "slug": "kth-smallest-element-in-a-bst",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given the root of a **binary search tree** and an integer `k`, return the **`k`th smallest value** (1-indexed) among all node values in the tree.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["The number of nodes is n, with 1 <= k <= n <= 10^4","0 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [3,1,4,null,2], k = 1",
        "output": "1",
        "explanation": "The smallest value is 1."
      },
      {
        "input": "root = [5,3,6,2,4,null,null,1], k = 3",
        "output": "3",
        "explanation": "The values in order are 1, 2, 3, 4, 5, 6, so the third smallest is 3."
      }
    ],
    "functionName": "kthSmallest",
    "params": ["root","k"],
    "argTypes": ["tree"],
    "starterCode": {
      "javascript": "/**\n * function TreeNode(val, left, right) {\n *   this.val = val === undefined ? 0 : val;\n *   this.left = left === undefined ? null : left;\n *   this.right = right === undefined ? null : right;\n * }\n */\nfunction kthSmallest(root, k) {\n  // Write your solution here\n}",
      "python": "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def kthSmallest(self, root, k):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int kthSmallest(TreeNode* root, int k) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,1,4,null,2],1],
        "expected": 1
      },
      {
        "input": [[5,3,6,2,4,null,null,1],3],
        "expected": 3
      }
    ]
  },
  {
    "id": "number-of-islands",
    "title": "Number of Islands",
    "slug": "number-of-islands",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "You are given an `m x n` grid of the characters `\"1\"` (land) and `\"0\"` (water). Return the **number of islands**.\n\nAn island is a group of land cells connected **horizontally or vertically**. You may assume all four edges of the grid are surrounded by water.",
    "constraints": ["m == grid.length, n == grid[i].length","1 <= m, n <= 300","grid[i][j] is \"0\" or \"1\""],
    "examples": [
      {
        "input": "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]",
        "output": "1",
        "explanation": "All the land cells are connected, so there is one island."
      },
      {
        "input": "grid = [[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]",
        "output": "3",
        "explanation": "There are three separate groups of land."
      }
    ],
    "functionName": "numIslands",
    "params": ["grid"],
    "starterCode": {
      "javascript": "function numIslands(grid) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def numIslands(self, grid):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int numIslands(vector<vector<string>>& grid) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]],
        "expected": 1
      },
      {
        "input": [[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]],
        "expected": 3
      }
    ]
  },
  {
    "id": "max-area-of-island",
    "title": "Max Area of Island",
    "slug": "max-area-of-island",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "You are given an `m x n` binary matrix `grid`. An island is a group of `1`s (land) connected **horizontally or vertically**. The area of an island is the number of cells in it.\n\nReturn the **maximum area** of an island in the grid, or `0` if there is no island.",
    "constraints": ["m == grid.length, n == grid[i].length","1 <= m, n <= 50","grid[i][j] is 0 or 1"],
    "examples": [
      {
        "input": "grid = [[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]]",
        "output": "6",
        "explanation": "The largest island has 6 connected cells."
      },
      {
        "input": "grid = [[0,0,0,0,0,0,0,0]]",
        "output": "0",
        "explanation": "There is no land."
      }
    ],
    "functionName": "maxAreaOfIsland",
    "params": ["grid"],
    "starterCode": {
      "javascript": "function maxAreaOfIsland(grid) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def maxAreaOfIsland(self, grid):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int maxAreaOfIsland(vector<vector<int>>& grid) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]]],
        "expected": 6
      },
      {
        "input": [[[0,0,0,0,0,0,0,0]]],
        "expected": 0
      }
    ]
  },
  {
    "id": "pacific-atlantic-water-flow",
    "title": "Pacific Atlantic Water Flow",
    "slug": "pacific-atlantic-water-flow",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "An `m x n` grid `heights` gives the height above sea level of each cell of an island. The **Pacific Ocean** touches the island's left and top edges, and the **Atlantic Ocean** touches its right and bottom edges.\n\nRain water flows from a cell to a neighbouring cell (up, down, left or right) whose height is **less than or equal** to its own. Water can flow into an ocean from any cell next to that ocean.\n\nReturn every cell `[row, col]` from which rain water can reach **both** oceans. You may return the cells in any order.",
    "constraints": ["m == heights.length, n == heights[r].length","1 <= m, n <= 200","0 <= heights[r][c] <= 10^5"],
    "examples": [
      {
        "input": "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        "output": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
        "explanation": "Water from these seven cells can flow to both oceans."
      },
      {
        "input": "heights = [[1]]",
        "output": "[[0,0]]",
        "explanation": "The only cell touches both oceans."
      }
    ],
    "functionName": "pacificAtlantic",
    "params": ["heights"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function pacificAtlantic(heights) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def pacificAtlantic(self, heights):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]],
        "expected": [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]
      },
      {
        "input": [[[1]]],
        "expected": [[0,0]]
      }
    ]
  },
  {
    "id": "surrounded-regions",
    "title": "Surrounded Regions",
    "slug": "surrounded-regions",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "You are given an `m x n` matrix `board` containing the letters `\"X\"` and `\"O\"`. **Capture every region of `\"O\"`s that is fully surrounded by `\"X\"`s** by flipping all the `\"O\"`s in it to `\"X\"`.\n\nA region is a group of `\"O\"` cells connected horizontally or vertically. A region is surrounded only if none of its cells lies on the border of the board, so any region that touches the border is left unchanged.\n\nReturn the board after the capture.",
    "constraints": ["m == board.length, n == board[i].length","1 <= m, n <= 200","board[i][j] is \"X\" or \"O\""],
    "examples": [
      {
        "input": "board = [[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"O\",\"X\"],[\"X\",\"X\",\"O\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]",
        "output": "[[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]",
        "explanation": "The three O cells in the middle are surrounded, so they flip. The O in the bottom row touches the border and stays."
      },
      {
        "input": "board = [[\"X\"]]",
        "output": "[[\"X\"]]",
        "explanation": "Nothing to capture."
      }
    ],
    "functionName": "solve",
    "params": ["board"],
    "starterCode": {
      "javascript": "function solve(board) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def solve(self, board):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> solve(vector<vector<string>>& board) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]],
        "expected": [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]
      },
      {
        "input": [[["X"]]],
        "expected": [["X"]]
      }
    ]
  },
  {
    "id": "rotting-oranges",
    "title": "Rotting Oranges",
    "slug": "rotting-oranges",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "You are given an `m x n` grid where each cell is\n\n- `0`: empty,\n- `1`: a fresh orange, or\n- `2`: a rotten orange.\n\nEvery minute, each fresh orange that is **4-directionally adjacent** to a rotten orange becomes rotten.\n\nReturn the **minimum number of minutes** until no fresh orange is left. If that is impossible, return `-1`.",
    "constraints": ["m == grid.length, n == grid[i].length","1 <= m, n <= 10","grid[i][j] is 0, 1 or 2"],
    "examples": [
      {
        "input": "grid = [[2,1,1],[1,1,0],[0,1,1]]",
        "output": "4",
        "explanation": "All the oranges are rotten after 4 minutes."
      },
      {
        "input": "grid = [[2,1,1],[0,1,1],[1,0,1]]",
        "output": "-1",
        "explanation": "The orange in the bottom-left corner is never reached."
      },
      {
        "input": "grid = [[0,2]]",
        "output": "0",
        "explanation": "There are no fresh oranges, so no time is needed."
      }
    ],
    "functionName": "orangesRotting",
    "params": ["grid"],
    "starterCode": {
      "javascript": "function orangesRotting(grid) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def orangesRotting(self, grid):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int orangesRotting(vector<vector<int>>& grid) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[2,1,1],[1,1,0],[0,1,1]]],
        "expected": 4
      },
      {
        "input": [[[2,1,1],[0,1,1],[1,0,1]]],
        "expected": -1
      },
      {
        "input": [[[0,2]]],
        "expected": 0
      }
    ]
  },
  {
    "id": "course-schedule",
    "title": "Course Schedule",
    "slug": "course-schedule",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "There are `numCourses` courses labelled `0` to `numCourses - 1`. The array `prerequisites` holds pairs `[a, b]`, meaning you **must take course `b` before course `a`**.\n\nReturn `true` if it is possible to finish all the courses, and `false` otherwise.",
    "constraints": ["1 <= numCourses <= 2000","0 <= prerequisites.length <= 5000","prerequisites[i].length == 2","0 <= a, b < numCourses","All the pairs are unique"],
    "examples": [
      {
        "input": "numCourses = 2, prerequisites = [[1,0]]",
        "output": "true",
        "explanation": "Take course 0, then course 1."
      },
      {
        "input": "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        "output": "false",
        "explanation": "Each course requires the other, so it is impossible."
      }
    ],
    "functionName": "canFinish",
    "params": ["numCourses","prerequisites"],
    "starterCode": {
      "javascript": "function canFinish(numCourses, prerequisites) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def canFinish(self, numCourses, prerequisites):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [2,[[1,0]]],
        "expected": true
      },
      {
        "input": [2,[[1,0],[0,1]]],
        "expected": false
      }
    ]
  },
  {
    "id": "course-schedule-ii",
    "title": "Course Schedule II",
    "slug": "course-schedule-ii",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "There are `numCourses` courses labelled `0` to `numCourses - 1`. The array `prerequisites` holds pairs `[a, b]`, meaning you **must take course `b` before course `a`**.\n\nReturn an order in which you can take **all** the courses. If it is impossible to finish them all, return an empty array.\n\nMany valid orders can exist, so to make the answer unique, return the **lexicographically smallest** one: at every step take the smallest-numbered course whose prerequisites are already done.",
    "constraints": ["1 <= numCourses <= 2000","0 <= prerequisites.length <= numCourses * (numCourses - 1)","prerequisites[i].length == 2","0 <= a, b < numCourses","a != b, and all the pairs are unique"],
    "examples": [
      {
        "input": "numCourses = 2, prerequisites = [[1,0]]",
        "output": "[0,1]",
        "explanation": "Course 0 comes first, then course 1."
      },
      {
        "input": "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
        "output": "[0,1,2,3]",
        "explanation": "After course 0, courses 1 and 2 are both available; the smaller number goes first."
      },
      {
        "input": "numCourses = 1, prerequisites = []",
        "output": "[0]",
        "explanation": "A single course with no prerequisites."
      }
    ],
    "functionName": "findOrder",
    "params": ["numCourses","prerequisites"],
    "starterCode": {
      "javascript": "function findOrder(numCourses, prerequisites) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def findOrder(self, numCourses, prerequisites):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [2,[[1,0]]],
        "expected": [0,1]
      },
      {
        "input": [4,[[1,0],[2,0],[3,1],[3,2]]],
        "expected": [0,1,2,3]
      },
      {
        "input": [1,[]],
        "expected": [0]
      }
    ]
  },
  {
    "id": "climbing-stairs",
    "title": "Climbing Stairs",
    "slug": "climbing-stairs",
    "difficulty": "Easy",
    "category": "Dynamic Programming",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "You are climbing a staircase with `n` steps. Each time you can climb either **1 or 2** steps.\n\nReturn the number of distinct ways you can climb to the top.",
    "constraints": ["1 <= n <= 45"],
    "examples": [
      {
        "input": "n = 2",
        "output": "2",
        "explanation": "Two ways: 1 + 1 or 2."
      },
      {
        "input": "n = 3",
        "output": "3",
        "explanation": "Three ways: 1 + 1 + 1, 1 + 2 or 2 + 1."
      }
    ],
    "functionName": "climbStairs",
    "params": ["n"],
    "starterCode": {
      "javascript": "function climbStairs(n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def climbStairs(self, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int climbStairs(int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [2],
        "expected": 2
      },
      {
        "input": [3],
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
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "You are given an array `cost` where `cost[i]` is the price of stepping **off** stair `i`. After paying the cost you can climb **one or two** stairs.\n\nYou may start from stair `0` or stair `1`. Return the **minimum total cost** to reach the top of the floor, which is one step past the last stair.",
    "constraints": ["2 <= cost.length <= 1000","0 <= cost[i] <= 999"],
    "examples": [
      {
        "input": "cost = [10,15,20]",
        "output": "15",
        "explanation": "Start at index 1, pay 15 and climb two steps to the top."
      },
      {
        "input": "cost = [1,100,1,1,1,100,1,1,100,1]",
        "output": "6",
        "explanation": "Start at index 0 and step on the stairs of cost 1 only, paying 6 in total."
      }
    ],
    "functionName": "minCostClimbingStairs",
    "params": ["cost"],
    "starterCode": {
      "javascript": "function minCostClimbingStairs(cost) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def minCostClimbingStairs(self, cost):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int minCostClimbingStairs(vector<int>& cost) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[10,15,20]],
        "expected": 15
      },
      {
        "input": [[1,100,1,1,1,100,1,1,100,1]],
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
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "You are a robber planning to rob houses along a street. Each house `i` holds `nums[i]` dollars, but **adjacent houses have linked alarms**: robbing two neighbouring houses sets off the alarm.\n\nReturn the **maximum amount** you can rob without triggering the alarm.",
    "constraints": ["1 <= nums.length <= 100","0 <= nums[i] <= 400"],
    "examples": [
      {
        "input": "nums = [1,2,3,1]",
        "output": "4",
        "explanation": "Rob houses 0 and 2 for 1 + 3 = 4."
      },
      {
        "input": "nums = [2,7,9,3,1]",
        "output": "12",
        "explanation": "Rob houses 0, 2 and 4 for 2 + 9 + 1 = 12."
      }
    ],
    "functionName": "rob",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function rob(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def rob(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,1]],
        "expected": 4
      },
      {
        "input": [[2,7,9,3,1]],
        "expected": 12
      }
    ]
  },
  {
    "id": "house-robber-ii",
    "title": "House Robber II",
    "slug": "house-robber-ii",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "The houses are now arranged in a **circle**, so the first and the last house are neighbours. As before, robbing two adjacent houses sets off the alarm.\n\nGiven `nums`, where `nums[i]` is the money in house `i`, return the **maximum amount** you can rob without triggering the alarm.",
    "constraints": ["1 <= nums.length <= 100","0 <= nums[i] <= 1000"],
    "examples": [
      {
        "input": "nums = [2,3,2]",
        "output": "3",
        "explanation": "Houses 0 and 2 are neighbours in the circle, so you cannot rob both. The best is the middle house: 3."
      },
      {
        "input": "nums = [1,2,3,1]",
        "output": "4",
        "explanation": "Rob house 0 and house 2 for 1 + 3 = 4."
      },
      {
        "input": "nums = [1,2,3]",
        "output": "3",
        "explanation": "Houses 0 and 2 are neighbours in the circle, so the best is to rob house 2 alone: 3."
      }
    ],
    "functionName": "rob",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function rob(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def rob(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,3,2]],
        "expected": 3
      },
      {
        "input": [[1,2,3,1]],
        "expected": 4
      },
      {
        "input": [[1,2,3]],
        "expected": 3
      }
    ]
  },
  {
    "id": "longest-palindromic-substring",
    "title": "Longest Palindromic Substring",
    "slug": "longest-palindromic-substring",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Given a string `s`, return its **longest palindromic substring**.\n\nIf several palindromic substrings share the maximum length, return the one that **starts first** in `s`.",
    "constraints": ["1 <= s.length <= 1000","s consists of digits and English letters"],
    "examples": [
      {
        "input": "s = \"babad\"",
        "output": "\"bab\"",
        "explanation": "\"aba\" is also valid, but \"bab\" starts first."
      },
      {
        "input": "s = \"cbbd\"",
        "output": "\"bb\"",
        "explanation": "The longest palindrome is \"bb\"."
      },
      {
        "input": "s = \"a\"",
        "output": "\"a\"",
        "explanation": "A single character is a palindrome."
      }
    ],
    "functionName": "longestPalindrome",
    "params": ["s"],
    "starterCode": {
      "javascript": "function longestPalindrome(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def longestPalindrome(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    string longestPalindrome(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["babad"],
        "expected": "bab"
      },
      {
        "input": ["cbbd"],
        "expected": "bb"
      },
      {
        "input": ["a"],
        "expected": "a"
      }
    ]
  },
  {
    "id": "palindromic-substrings",
    "title": "Palindromic Substrings",
    "slug": "palindromic-substrings",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given a string `s`, return the **number of palindromic substrings** in it.\n\nA substring is a contiguous sequence of characters. Substrings at different positions count separately, even if they contain the same characters.",
    "constraints": ["1 <= s.length <= 1000","s consists of lowercase English letters"],
    "examples": [
      {
        "input": "s = \"abc\"",
        "output": "3",
        "explanation": "Three palindromes: \"a\", \"b\" and \"c\"."
      },
      {
        "input": "s = \"aaa\"",
        "output": "6",
        "explanation": "Six palindromes: \"a\", \"a\", \"a\", \"aa\", \"aa\" and \"aaa\"."
      }
    ],
    "functionName": "countSubstrings",
    "params": ["s"],
    "starterCode": {
      "javascript": "function countSubstrings(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def countSubstrings(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int countSubstrings(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["abc"],
        "expected": 3
      },
      {
        "input": ["aaa"],
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
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "A message made of capital letters is encoded as digits using the mapping `\"A\" -> \"1\"`, `\"B\" -> \"2\"`, ..., `\"Z\" -> \"26\"`.\n\nGiven a string `s` of digits, return the **number of ways to decode it**. A way is valid only if every group maps to a letter; for example `\"06\"` cannot be decoded because `\"0\"` and `\"06\"` do not map to any letter.\n\nThe answer is guaranteed to fit in a 32-bit integer.",
    "constraints": ["1 <= s.length <= 100","s contains only digits and may contain leading zeros"],
    "examples": [
      {
        "input": "s = \"12\"",
        "output": "2",
        "explanation": "\"12\" can be decoded as \"AB\" (1 2) or \"L\" (12)."
      },
      {
        "input": "s = \"226\"",
        "output": "3",
        "explanation": "\"226\" can be \"BZ\" (2 26), \"VF\" (22 6) or \"BBF\" (2 2 6)."
      },
      {
        "input": "s = \"06\"",
        "output": "0",
        "explanation": "\"06\" has no valid decoding."
      }
    ],
    "functionName": "numDecodings",
    "params": ["s"],
    "starterCode": {
      "javascript": "function numDecodings(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def numDecodings(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int numDecodings(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["12"],
        "expected": 2
      },
      {
        "input": ["226"],
        "expected": 3
      },
      {
        "input": ["06"],
        "expected": 0
      }
    ]
  },
  {
    "id": "coin-change",
    "title": "Coin Change",
    "slug": "coin-change",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "You are given an integer array `coins` of coin denominations and an integer `amount`. You have an unlimited supply of each coin.\n\nReturn the **fewest coins** needed to make up `amount`. If it cannot be made up by any combination of the coins, return `-1`.",
    "constraints": ["1 <= coins.length <= 12","1 <= coins[i] <= 2^31 - 1","0 <= amount <= 10^4"],
    "examples": [
      {
        "input": "coins = [1,2,5], amount = 11",
        "output": "3",
        "explanation": "11 = 5 + 5 + 1, which uses three coins."
      },
      {
        "input": "coins = [2], amount = 3",
        "output": "-1",
        "explanation": "The amount 3 cannot be made with coins of 2."
      },
      {
        "input": "coins = [1], amount = 0",
        "output": "0",
        "explanation": "The amount 0 needs no coins."
      }
    ],
    "functionName": "coinChange",
    "params": ["coins","amount"],
    "starterCode": {
      "javascript": "function coinChange(coins, amount) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def coinChange(self, coins, amount):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,5],11],
        "expected": 3
      },
      {
        "input": [[2],3],
        "expected": -1
      },
      {
        "input": [[1],0],
        "expected": 0
      }
    ]
  },
  {
    "id": "maximum-product-subarray",
    "title": "Maximum Product Subarray",
    "slug": "maximum-product-subarray",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, find a **contiguous non-empty subarray** whose product is the largest, and return that product.\n\nThe answer is guaranteed to fit in a 32-bit integer.",
    "constraints": ["1 <= nums.length <= 2 * 10^4","-10 <= nums[i] <= 10","The product of any prefix or suffix of nums fits in a 32-bit integer"],
    "examples": [
      {
        "input": "nums = [2,3,-2,4]",
        "output": "6",
        "explanation": "The subarray [2, 3] has the largest product, 6."
      },
      {
        "input": "nums = [-2,0,-1]",
        "output": "0",
        "explanation": "The result cannot be 2 because [-2, -1] is not contiguous; the best is 0."
      }
    ],
    "functionName": "maxProduct",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function maxProduct(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def maxProduct(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int maxProduct(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,3,-2,4]],
        "expected": 6
      },
      {
        "input": [[-2,0,-1]],
        "expected": 0
      }
    ]
  },
  {
    "id": "word-break",
    "title": "Word Break",
    "slug": "word-break",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be split into a sequence of **one or more dictionary words**.\n\nA dictionary word may be reused as many times as you like.",
    "constraints": ["1 <= s.length <= 300","1 <= wordDict.length <= 1000","1 <= wordDict[i].length <= 20","s and wordDict[i] consist of lowercase English letters","All strings in wordDict are unique"],
    "examples": [
      {
        "input": "s = \"leetcode\", wordDict = [\"leet\",\"code\"]",
        "output": "true",
        "explanation": "\"leetcode\" can be split as \"leet code\"."
      },
      {
        "input": "s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]",
        "output": "true",
        "explanation": "\"applepenapple\" can be split as \"apple pen apple\"."
      },
      {
        "input": "s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]",
        "output": "false",
        "explanation": "No split uses only dictionary words."
      }
    ],
    "functionName": "wordBreak",
    "params": ["s","wordDict"],
    "starterCode": {
      "javascript": "function wordBreak(s, wordDict) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def wordBreak(self, s, wordDict):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["leetcode",["leet","code"]],
        "expected": true
      },
      {
        "input": ["applepenapple",["apple","pen"]],
        "expected": true
      },
      {
        "input": ["catsandog",["cats","dog","sand","and","cat"]],
        "expected": false
      }
    ]
  },
  {
    "id": "longest-increasing-subsequence",
    "title": "Longest Increasing Subsequence",
    "slug": "longest-increasing-subsequence",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums`, return the **length of the longest strictly increasing subsequence**.\n\nA subsequence keeps the original order of elements but may skip some of them.",
    "constraints": ["1 <= nums.length <= 2500","-10^4 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "nums = [10,9,2,5,3,7,101,18]",
        "output": "4",
        "explanation": "One longest subsequence is [2, 3, 7, 101]."
      },
      {
        "input": "nums = [0,1,0,3,2,3]",
        "output": "4",
        "explanation": "One longest subsequence is [0, 1, 2, 3]."
      },
      {
        "input": "nums = [7,7,7,7,7,7,7]",
        "output": "1",
        "explanation": "Strictly increasing means equal values cannot be repeated."
      }
    ],
    "functionName": "lengthOfLIS",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function lengthOfLIS(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def lengthOfLIS(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[10,9,2,5,3,7,101,18]],
        "expected": 4
      },
      {
        "input": [[0,1,0,3,2,3]],
        "expected": 4
      },
      {
        "input": [[7,7,7,7,7,7,7]],
        "expected": 1
      }
    ]
  },
  {
    "id": "unique-paths",
    "title": "Unique Paths",
    "slug": "unique-paths",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "A robot stands in the top-left corner of an `m x n` grid and wants to reach the bottom-right corner. At each step it can move only **down or right**.\n\nReturn the number of **unique paths** the robot can take.",
    "constraints": ["1 <= m, n <= 100","The answer is guaranteed to be less than or equal to 2 * 10^9"],
    "examples": [
      {
        "input": "m = 3, n = 7",
        "output": "28",
        "explanation": "There are 28 paths through a 3 x 7 grid."
      },
      {
        "input": "m = 3, n = 2",
        "output": "3",
        "explanation": "There are 3 paths through a 3 x 2 grid: right-down-down, down-down-right and down-right-down."
      }
    ],
    "functionName": "uniquePaths",
    "params": ["m","n"],
    "starterCode": {
      "javascript": "function uniquePaths(m, n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def uniquePaths(self, m, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [3,7],
        "expected": 28
      },
      {
        "input": [3,2],
        "expected": 3
      }
    ]
  },
  {
    "id": "jump-game",
    "title": "Jump Game",
    "slug": "jump-game",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "You are given an integer array `nums`. You start at the first index and each element `nums[i]` is your **maximum jump length** from position `i`.\n\nReturn `true` if you can reach the **last index**, and `false` otherwise.",
    "constraints": ["1 <= nums.length <= 10^4","0 <= nums[i] <= 10^5"],
    "examples": [
      {
        "input": "nums = [2,3,1,1,4]",
        "output": "true",
        "explanation": "Jump 1 step from index 0 to 1, then 3 steps to the last index."
      },
      {
        "input": "nums = [3,2,1,0,4]",
        "output": "false",
        "explanation": "You always arrive at index 3, whose jump length is 0, so you can never reach the last index."
      }
    ],
    "functionName": "canJump",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function canJump(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def canJump(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool canJump(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,3,1,1,4]],
        "expected": true
      },
      {
        "input": [[3,2,1,0,4]],
        "expected": false
      }
    ]
  },
  {
    "id": "jump-game-ii",
    "title": "Jump Game II",
    "slug": "jump-game-ii",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "You are given an integer array `nums` and start at index `0`. Each `nums[i]` is your **maximum jump length** from index `i`.\n\nReturn the **minimum number of jumps** needed to reach the last index. You can assume the last index is always reachable.",
    "constraints": ["1 <= nums.length <= 10^4","0 <= nums[i] <= 1000","The last index is always reachable"],
    "examples": [
      {
        "input": "nums = [2,3,1,1,4]",
        "output": "2",
        "explanation": "Jump 1 step to index 1, then 3 steps to the last index: 2 jumps."
      },
      {
        "input": "nums = [2,3,0,1,4]",
        "output": "2",
        "explanation": "Jump to index 1, then to the end: 2 jumps."
      }
    ],
    "functionName": "jump",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function jump(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def jump(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int jump(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,3,1,1,4]],
        "expected": 2
      },
      {
        "input": [[2,3,0,1,4]],
        "expected": 2
      }
    ]
  },
  {
    "id": "gas-station",
    "title": "Gas Station",
    "slug": "gas-station",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "There are `n` gas stations on a circular route. Station `i` has `gas[i]` units of fuel, and driving from station `i` to the next one costs `cost[i]` units. Your tank starts empty and has unlimited capacity.\n\nReturn the **index of the station where you should start** to complete the full circuit clockwise, or `-1` if that is impossible. If a solution exists it is guaranteed to be unique.",
    "constraints": ["n == gas.length == cost.length","1 <= n <= 10^5","0 <= gas[i], cost[i] <= 10^4","If a solution exists, it is unique"],
    "examples": [
      {
        "input": "gas = [1,2,3,4,5], cost = [3,4,5,1,2]",
        "output": "3",
        "explanation": "Start at station 3 with 4 units, and every later stop leaves you with enough fuel."
      },
      {
        "input": "gas = [2,3,4], cost = [3,4,3]",
        "output": "-1",
        "explanation": "Whichever station you start at, you run out of fuel before finishing the circuit."
      }
    ],
    "functionName": "canCompleteCircuit",
    "params": ["gas","cost"],
    "starterCode": {
      "javascript": "function canCompleteCircuit(gas, cost) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def canCompleteCircuit(self, gas, cost):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3,4,5],[3,4,5,1,2]],
        "expected": 3
      },
      {
        "input": [[2,3,4],[3,4,3]],
        "expected": -1
      }
    ]
  },
  {
    "id": "insert-interval",
    "title": "Insert Interval",
    "slug": "insert-interval",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "You are given an array `intervals` of **non-overlapping** intervals `[start, end]`, **sorted by start**, and another interval `newInterval`.\n\nInsert `newInterval` so that the result is still sorted and has no overlapping intervals, **merging** any intervals that overlap with it. Return the resulting array.",
    "constraints": ["0 <= intervals.length <= 10^4","intervals[i].length == 2","0 <= start <= end <= 10^5","intervals is sorted by start in ascending order","newInterval.length == 2"],
    "examples": [
      {
        "input": "intervals = [[1,3],[6,9]], newInterval = [2,5]",
        "output": "[[1,5],[6,9]]",
        "explanation": "The new interval overlaps [1, 3], so they merge into [1, 5]."
      },
      {
        "input": "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]",
        "output": "[[1,2],[3,10],[12,16]]",
        "explanation": "The new interval [4, 8] overlaps [3, 5], [6, 7] and [8, 10], which merge into [3, 10]."
      }
    ],
    "functionName": "insert",
    "params": ["intervals","newInterval"],
    "starterCode": {
      "javascript": "function insert(intervals, newInterval) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def insert(self, intervals, newInterval):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,3],[6,9]],[2,5]],
        "expected": [[1,5],[6,9]]
      },
      {
        "input": [[[1,2],[3,5],[6,7],[8,10],[12,16]],[4,8]],
        "expected": [[1,2],[3,10],[12,16]]
      }
    ]
  },
  {
    "id": "merge-intervals",
    "title": "Merge Intervals",
    "slug": "merge-intervals",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given an array of `intervals` where `intervals[i] = [start, end]`, **merge all overlapping intervals** and return an array of the non-overlapping intervals that cover all the input intervals, sorted by start.\n\nTwo intervals that share only an endpoint, such as `[1, 4]` and `[4, 5]`, are considered overlapping.",
    "constraints": ["1 <= intervals.length <= 10^4","intervals[i].length == 2","0 <= start <= end <= 10^4"],
    "examples": [
      {
        "input": "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        "output": "[[1,6],[8,10],[15,18]]",
        "explanation": "[1, 3] and [2, 6] overlap and merge into [1, 6]."
      },
      {
        "input": "intervals = [[1,4],[4,5]]",
        "output": "[[1,5]]",
        "explanation": "The two intervals touch at 4, so they merge."
      }
    ],
    "functionName": "merge",
    "params": ["intervals"],
    "starterCode": {
      "javascript": "function merge(intervals) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def merge(self, intervals):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,3],[2,6],[8,10],[15,18]]],
        "expected": [[1,6],[8,10],[15,18]]
      },
      {
        "input": [[[1,4],[4,5]]],
        "expected": [[1,5]]
      }
    ]
  },
  {
    "id": "non-overlapping-intervals",
    "title": "Non-overlapping Intervals",
    "slug": "non-overlapping-intervals",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Given an array of `intervals` where `intervals[i] = [start, end]`, return the **minimum number of intervals you must remove** so that the rest are non-overlapping.\n\nIntervals that only touch at an endpoint, such as `[1, 2]` and `[2, 3]`, do **not** overlap.",
    "constraints": ["1 <= intervals.length <= 10^5","intervals[i].length == 2","-5 * 10^4 <= start < end <= 5 * 10^4"],
    "examples": [
      {
        "input": "intervals = [[1,2],[2,3],[3,4],[1,3]]",
        "output": "1",
        "explanation": "Removing [1, 3] leaves three non-overlapping intervals."
      },
      {
        "input": "intervals = [[1,2],[1,2],[1,2]]",
        "output": "2",
        "explanation": "The three intervals are identical, so two must go."
      },
      {
        "input": "intervals = [[1,2],[2,3]]",
        "output": "0",
        "explanation": "The intervals only touch, so nothing needs to be removed."
      }
    ],
    "functionName": "eraseOverlapIntervals",
    "params": ["intervals"],
    "starterCode": {
      "javascript": "function eraseOverlapIntervals(intervals) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def eraseOverlapIntervals(self, intervals):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int eraseOverlapIntervals(vector<vector<int>>& intervals) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,2],[2,3],[3,4],[1,3]]],
        "expected": 1
      },
      {
        "input": [[[1,2],[1,2],[1,2]]],
        "expected": 2
      },
      {
        "input": [[[1,2],[2,3]]],
        "expected": 0
      }
    ]
  },
  {
    "id": "subsets",
    "title": "Subsets",
    "slug": "subsets",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums` of **unique** elements, return **all possible subsets** (the power set).\n\nThe solution must not contain duplicate subsets. You may return the subsets and the numbers inside each subset in any order.",
    "constraints": ["1 <= nums.length <= 10","-10 <= nums[i] <= 10","All the numbers of nums are unique"],
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]",
        "explanation": "There are 2^3 = 8 subsets, from the empty one to the whole array."
      },
      {
        "input": "nums = [0]",
        "output": "[[],[0]]",
        "explanation": "The empty subset and the subset with the single element."
      }
    ],
    "functionName": "subsets",
    "params": ["nums"],
    "compare": "unordered-deep",
    "starterCode": {
      "javascript": "function subsets(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def subsets(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> subsets(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3]],
        "expected": [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
      },
      {
        "input": [[0]],
        "expected": [[],[0]]
      }
    ]
  },
  {
    "id": "combination-sum",
    "title": "Combination Sum",
    "slug": "combination-sum",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given an array of **distinct** integers `candidates` and a target integer `target`, return **every unique combination** of candidates that sums to `target`. You may return the combinations in any order.\n\nThe same number may be used **an unlimited number of times**. Two combinations are different if the frequency of at least one chosen number differs.",
    "constraints": ["1 <= candidates.length <= 30","2 <= candidates[i] <= 40","All the elements of candidates are distinct","1 <= target <= 40"],
    "examples": [
      {
        "input": "candidates = [2,3,6,7], target = 7",
        "output": "[[2,2,3],[7]]",
        "explanation": "2 + 2 + 3 = 7 and 7 = 7 are the only combinations."
      },
      {
        "input": "candidates = [2,3,5], target = 8",
        "output": "[[2,2,2,2],[2,3,3],[3,5]]",
        "explanation": "Three combinations reach 8."
      },
      {
        "input": "candidates = [2], target = 1",
        "output": "[]",
        "explanation": "No combination of 2s makes 1."
      }
    ],
    "functionName": "combinationSum",
    "params": ["candidates","target"],
    "compare": "unordered-deep",
    "starterCode": {
      "javascript": "function combinationSum(candidates, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def combinationSum(self, candidates, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,3,6,7],7],
        "expected": [[2,2,3],[7]]
      },
      {
        "input": [[2,3,5],8],
        "expected": [[2,2,2,2],[2,3,3],[3,5]]
      },
      {
        "input": [[2],1],
        "expected": []
      }
    ]
  },
  {
    "id": "permutations",
    "title": "Permutations",
    "slug": "permutations",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Given an array `nums` of **distinct** integers, return **all the possible permutations**. You may return the answer in any order.",
    "constraints": ["1 <= nums.length <= 6","-10 <= nums[i] <= 10","All the integers of nums are unique"],
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        "explanation": "Six arrangements of three numbers."
      },
      {
        "input": "nums = [0,1]",
        "output": "[[0,1],[1,0]]",
        "explanation": "Two arrangements."
      },
      {
        "input": "nums = [1]",
        "output": "[[1]]",
        "explanation": "One number has one arrangement."
      }
    ],
    "functionName": "permute",
    "params": ["nums"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function permute(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def permute(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> permute(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3]],
        "expected": [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
      },
      {
        "input": [[0,1]],
        "expected": [[0,1],[1,0]]
      },
      {
        "input": [[1]],
        "expected": [[1]]
      }
    ]
  },
  {
    "id": "subsets-ii",
    "title": "Subsets II",
    "slug": "subsets-ii",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums` that **may contain duplicates**, return **all possible subsets** (the power set).\n\nThe solution must not contain duplicate subsets. You may return the subsets and the numbers inside each subset in any order.",
    "constraints": ["1 <= nums.length <= 10","-10 <= nums[i] <= 10"],
    "examples": [
      {
        "input": "nums = [1,2,2]",
        "output": "[[],[1],[1,2],[1,2,2],[2],[2,2]]",
        "explanation": "Only six distinct subsets exist, because the two 2s are interchangeable."
      },
      {
        "input": "nums = [0]",
        "output": "[[],[0]]",
        "explanation": "The empty subset and the subset with the single element."
      }
    ],
    "functionName": "subsetsWithDup",
    "params": ["nums"],
    "compare": "unordered-deep",
    "starterCode": {
      "javascript": "function subsetsWithDup(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def subsetsWithDup(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> subsetsWithDup(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,2]],
        "expected": [[],[1],[1,2],[1,2,2],[2],[2,2]]
      },
      {
        "input": [[0]],
        "expected": [[],[0]]
      }
    ]
  },
  {
    "id": "combination-sum-ii",
    "title": "Combination Sum II",
    "slug": "combination-sum-ii",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given a collection of candidate numbers `candidates` (which may contain duplicates) and a `target`, return **every unique combination** that sums to `target`.\n\nEach number in `candidates` may be used **at most once**. The answer must not contain duplicate combinations, and you may return them in any order.",
    "constraints": ["1 <= candidates.length <= 100","1 <= candidates[i] <= 50","1 <= target <= 30"],
    "examples": [
      {
        "input": "candidates = [10,1,2,7,6,1,5], target = 8",
        "output": "[[1,1,6],[1,2,5],[1,7],[2,6]]",
        "explanation": "Four unique combinations reach 8."
      },
      {
        "input": "candidates = [2,5,2,1,2], target = 5",
        "output": "[[1,2,2],[5]]",
        "explanation": "The two combinations that reach 5."
      }
    ],
    "functionName": "combinationSum2",
    "params": ["candidates","target"],
    "compare": "unordered-deep",
    "starterCode": {
      "javascript": "function combinationSum2(candidates, target) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def combinationSum2(self, candidates, target):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[10,1,2,7,6,1,5],8],
        "expected": [[1,1,6],[1,2,5],[1,7],[2,6]]
      },
      {
        "input": [[2,5,2,1,2],5],
        "expected": [[1,2,2],[5]]
      }
    ]
  },
  {
    "id": "word-search",
    "title": "Word Search",
    "slug": "word-search",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word is built from letters of **sequentially adjacent** cells (horizontally or vertically neighbouring). The same cell may **not be used more than once** in a word.",
    "constraints": ["m == board.length, n == board[i].length","1 <= m, n <= 6","1 <= word.length <= 15","board and word consist of only lowercase and uppercase English letters"],
    "examples": [
      {
        "input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCCED\"",
        "output": "true",
        "explanation": "The path A-B-C-C-E-D exists."
      },
      {
        "input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"SEE\"",
        "output": "true",
        "explanation": "The path S-E-E exists."
      },
      {
        "input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCB\"",
        "output": "false",
        "explanation": "The second B would need a cell that is already used."
      }
    ],
    "functionName": "exist",
    "params": ["board","word"],
    "starterCode": {
      "javascript": "function exist(board, word) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def exist(self, board, word):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool exist(vector<vector<string>>& board, string word) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCCED"],
        "expected": true
      },
      {
        "input": [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"SEE"],
        "expected": true
      },
      {
        "input": [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCB"],
        "expected": false
      }
    ]
  },
  {
    "id": "n-queens",
    "title": "N-Queens",
    "slug": "n-queens",
    "difficulty": "Hard",
    "category": "Backtracking & Heaps",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "The **n-queens puzzle** asks you to place `n` chess queens on an `n x n` board so that **no two queens attack each other**: no two share a row, a column or a diagonal.\n\nGiven `n`, return **every distinct solution**. Each solution is a board written as an array of `n` strings, where `\"Q\"` is a queen and `\".\"` is an empty square. You may return the solutions in any order.",
    "constraints": ["1 <= n <= 8"],
    "examples": [
      {
        "input": "n = 4",
        "output": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]",
        "explanation": "There are two distinct solutions for a 4 x 4 board."
      },
      {
        "input": "n = 1",
        "output": "[[\"Q\"]]",
        "explanation": "A single queen on a 1 x 1 board."
      }
    ],
    "functionName": "solveNQueens",
    "params": ["n"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function solveNQueens(n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def solveNQueens(self, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> solveNQueens(int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [4],
        "expected": [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]
      },
      {
        "input": [1],
        "expected": [["Q"]]
      }
    ]
  },
  {
    "id": "kth-largest-element-in-a-stream",
    "title": "Kth Largest Element in a Stream",
    "slug": "kth-largest-element-in-a-stream",
    "difficulty": "Easy",
    "category": "Backtracking & Heaps",
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Design a class that finds the **`k`th largest element in a stream** of numbers. It is the `k`th largest in sorted order, not the `k`th distinct element.\n\nImplement the `KthLargest` class:\n\n- `KthLargest(k, nums)` creates the object with the integer `k` and the initial stream `nums`.\n- `add(val)` adds `val` to the stream and returns the current `k`th largest element.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["1 <= k <= 10^4","0 <= nums.length <= 10^4","-10^4 <= nums[i], val <= 10^4","At most 10^4 calls are made to add","There are at least k elements when add is called"],
    "examples": [
      {
        "input": "operations = [\"KthLargest\",\"add\",\"add\",\"add\",\"add\",\"add\"], arguments = [[3,[4,5,8,2]],[3],[5],[10],[9],[4]]",
        "output": "[null,4,5,5,8,8]",
        "explanation": "With k = 3, the stream 4, 5, 8, 2 and then adds 3, 5, 10, 9, 4 give the third largest after each add: 4, 5, 5, 8, 8."
      }
    ],
    "functionName": "KthLargest",
    "kind": "design",
    "starterCode": {
      "javascript": "class KthLargest {\n  constructor(k, nums) {\n  }\n\n  add(val) {\n  }\n}",
      "python": "class KthLargest:\n    def __init__(self, k, nums):\n        pass\n\n    def add(self, val):\n        pass",
      "cpp": "class KthLargest {\npublic:\n    KthLargest(int k, vector<int>& nums) {\n    }\n\n    int add(int val) {\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["KthLargest","add","add","add","add","add"],[[3,[4,5,8,2]],[3],[5],[10],[9],[4]]],
        "expected": [null,4,5,5,8,8]
      }
    ]
  },
  {
    "id": "last-stone-weight",
    "title": "Last Stone Weight",
    "slug": "last-stone-weight",
    "difficulty": "Easy",
    "category": "Backtracking & Heaps",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "You are given an array `stones` where `stones[i]` is the weight of the `i`th stone.\n\nEach turn, take the **two heaviest stones** and smash them together. If their weights are `x <= y`:\n\n- if `x == y`, both stones are destroyed;\n- otherwise the stone of weight `x` is destroyed and the stone of weight `y` becomes `y - x`.\n\nReturn the weight of the last remaining stone, or `0` if no stones are left.",
    "constraints": ["1 <= stones.length <= 30","1 <= stones[i] <= 1000"],
    "examples": [
      {
        "input": "stones = [2,7,4,1,8,1]",
        "output": "1",
        "explanation": "Smashing 8 and 7 leaves 1, then the stones become [2,4,1,1,1], and so on until a single stone of weight 1 remains."
      },
      {
        "input": "stones = [1]",
        "output": "1",
        "explanation": "A single stone stays as it is."
      }
    ],
    "functionName": "lastStoneWeight",
    "params": ["stones"],
    "starterCode": {
      "javascript": "function lastStoneWeight(stones) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def lastStoneWeight(self, stones):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int lastStoneWeight(vector<int>& stones) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,7,4,1,8,1]],
        "expected": 1
      },
      {
        "input": [[1]],
        "expected": 1
      }
    ]
  },
  {
    "id": "k-closest-points-to-origin",
    "title": "K Closest Points to Origin",
    "slug": "k-closest-points-to-origin",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Given an array `points` where `points[i] = [x, y]` is a point on the plane, and an integer `k`, return the **`k` closest points to the origin** `(0, 0)`.\n\nDistance is the usual Euclidean distance. You may return the points in any order. The answer is guaranteed to be unique, apart from its order.",
    "constraints": ["1 <= k <= points.length <= 10^4","-10^4 <= x, y <= 10^4","The k closest points are uniquely defined"],
    "examples": [
      {
        "input": "points = [[1,3],[-2,2]], k = 1",
        "output": "[[-2,2]]",
        "explanation": "The distance of [1,3] is sqrt(10) and of [-2,2] is sqrt(8), so [-2,2] is closer."
      },
      {
        "input": "points = [[3,3],[5,-1],[-2,4]], k = 2",
        "output": "[[3,3],[-2,4]]",
        "explanation": "The two closest points are [3,3] and [-2,4]."
      }
    ],
    "functionName": "kClosest",
    "params": ["points","k"],
    "compare": "unordered",
    "starterCode": {
      "javascript": "function kClosest(points, k) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def kClosest(self, points, k):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[[1,3],[-2,2]],1],
        "expected": [[-2,2]]
      },
      {
        "input": [[[3,3],[5,-1],[-2,4]],2],
        "expected": [[3,3],[-2,4]]
      }
    ]
  },
  {
    "id": "kth-largest-element-in-an-array",
    "title": "Kth Largest Element in an Array",
    "slug": "kth-largest-element-in-an-array",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "Given an integer array `nums` and an integer `k`, return the **`k`th largest element** in the array.\n\nIt is the `k`th largest in sorted order, not the `k`th distinct element. Can you solve it without sorting the whole array?",
    "constraints": ["1 <= k <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "nums = [3,2,1,5,6,4], k = 2",
        "output": "5",
        "explanation": "The sorted array is [1,2,3,4,5,6]; the second largest is 5."
      },
      {
        "input": "nums = [3,2,3,1,2,4,5,5,6], k = 4",
        "output": "4",
        "explanation": "The sorted array is [1,2,2,3,3,4,5,5,6]; the fourth largest is 4."
      }
    ],
    "functionName": "findKthLargest",
    "params": ["nums","k"],
    "starterCode": {
      "javascript": "function findKthLargest(nums, k) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def findKthLargest(self, nums, k):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int findKthLargest(vector<int>& nums, int k) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,2,1,5,6,4],2],
        "expected": 5
      },
      {
        "input": [[3,2,3,1,2,4,5,5,6],4],
        "expected": 4
      }
    ]
  },
  {
    "id": "task-scheduler",
    "title": "Task Scheduler",
    "slug": "task-scheduler",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "You are given an array `tasks` of capital letters, where each letter is a type of task, and a non-negative integer `n`. Every task takes **one unit of time**, and each unit you either run a task or stay idle.\n\nTwo tasks of the **same type** must be separated by at least `n` units of time. Tasks can be run in any order.\n\nReturn the **minimum number of time units** needed to finish all the tasks.",
    "constraints": ["1 <= tasks.length <= 10^4","tasks[i] is an uppercase English letter","0 <= n <= 100"],
    "examples": [
      {
        "input": "tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 2",
        "output": "8",
        "explanation": "One possible schedule is A B idle A B idle A B, which takes 8 units."
      },
      {
        "input": "tasks = [\"A\",\"C\",\"A\",\"B\",\"D\",\"B\"], n = 1",
        "output": "6",
        "explanation": "A C A B D B takes 6 units with one unit between equal tasks."
      },
      {
        "input": "tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 3",
        "output": "10",
        "explanation": "A B idle idle A B idle idle A B takes 10 units."
      }
    ],
    "functionName": "leastInterval",
    "params": ["tasks","n"],
    "starterCode": {
      "javascript": "function leastInterval(tasks, n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def leastInterval(self, tasks, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int leastInterval(vector<string>& tasks, int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["A","A","A","B","B","B"],2],
        "expected": 8
      },
      {
        "input": [["A","C","A","B","D","B"],1],
        "expected": 6
      },
      {
        "input": [["A","A","A","B","B","B"],3],
        "expected": 10
      }
    ]
  },
  {
    "id": "find-median-from-data-stream",
    "title": "Find Median from Data Stream",
    "slug": "find-median-from-data-stream",
    "difficulty": "Hard",
    "category": "Backtracking & Heaps",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "The **median** is the middle value of an ordered list of numbers. If the list has an even length, it is the average of the two middle values.\n\nDesign a data structure that supports a stream of numbers. Implement the `MedianFinder` class:\n\n- `MedianFinder()` creates the object.\n- `addNum(num)` adds an integer to the data structure.\n- `findMedian()` returns the median of all the numbers added so far. Answers within `10^-5` of the real value are accepted.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["-10^5 <= num <= 10^5","findMedian is only called after at least one element has been added","At most 5 * 10^4 calls are made"],
    "examples": [
      {
        "input": "operations = [\"MedianFinder\",\"addNum\",\"addNum\",\"findMedian\",\"addNum\",\"findMedian\"], arguments = [[],[1],[2],[],[3],[]]",
        "output": "[null,null,null,1.5,null,2]",
        "explanation": "After adding 1 and 2 the median is 1.5. After adding 3 the median is 2."
      }
    ],
    "functionName": "MedianFinder",
    "kind": "design",
    "starterCode": {
      "javascript": "class MedianFinder {\n  constructor() {\n  }\n\n  addNum(num) {\n  }\n\n  findMedian() {\n  }\n}",
      "python": "class MedianFinder:\n    def __init__(self):\n        pass\n\n    def addNum(self, num):\n        pass\n\n    def findMedian(self):\n        pass",
      "cpp": "class MedianFinder {\npublic:\n    MedianFinder() {\n    }\n\n    void addNum(int num) {\n    }\n\n    double findMedian() {\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["MedianFinder","addNum","addNum","findMedian","addNum","findMedian"],[[],[1],[2],[],[3],[]]],
        "expected": [null,null,null,1.5,null,2]
      }
    ]
  },
  {
    "id": "single-number",
    "title": "Single Number",
    "slug": "single-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Every element of the integer array `nums` appears **twice** except for one element, which appears exactly once. Find that single element.\n\nYour solution should run in linear time and use only constant extra space.",
    "constraints": ["1 <= nums.length <= 3 * 10^4","-3 * 10^4 <= nums[i] <= 3 * 10^4","Each element appears twice except for one that appears once"],
    "examples": [
      {
        "input": "nums = [2,2,1]",
        "output": "1",
        "explanation": "Only 1 appears once."
      },
      {
        "input": "nums = [4,1,2,1,2]",
        "output": "4",
        "explanation": "Only 4 appears once."
      }
    ],
    "functionName": "singleNumber",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function singleNumber(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def singleNumber(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int singleNumber(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[2,2,1]],
        "expected": 1
      },
      {
        "input": [[4,1,2,1,2]],
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
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Given a positive integer `n`, treated as a **32-bit unsigned integer**, return the number of `1` bits in its binary representation (its **Hamming weight**).",
    "constraints": ["1 <= n <= 2^32 - 1"],
    "examples": [
      {
        "input": "n = 11",
        "output": "3",
        "explanation": "11 is 1011 in binary, which has three 1 bits."
      },
      {
        "input": "n = 128",
        "output": "1",
        "explanation": "128 is 10000000 in binary, which has one 1 bit."
      },
      {
        "input": "n = 2147483645",
        "output": "30",
        "explanation": "2147483645 is 1111111111111111111111111111101 in binary, which has thirty 1 bits."
      }
    ],
    "functionName": "hammingWeight",
    "params": ["n"],
    "starterCode": {
      "javascript": "function hammingWeight(n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def hammingWeight(self, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int hammingWeight(uint32_t n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [11],
        "expected": 3
      },
      {
        "input": [128],
        "expected": 1
      },
      {
        "input": [2147483645],
        "expected": 30
      }
    ]
  },
  {
    "id": "counting-bits",
    "title": "Counting Bits",
    "slug": "counting-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Given an integer `n`, return an array `ans` of length `n + 1` where `ans[i]` is the **number of `1` bits** in the binary representation of `i`, for every `0 <= i <= n`.\n\nCan you do it in a single pass, without counting the bits of each number separately?",
    "constraints": ["0 <= n <= 10^5"],
    "examples": [
      {
        "input": "n = 2",
        "output": "[0,1,1]",
        "explanation": "0, 1 and 2 have 0, 1 and 1 set bits."
      },
      {
        "input": "n = 5",
        "output": "[0,1,1,2,1,2]",
        "explanation": "0 to 5 are 0, 1, 10, 11, 100 and 101 in binary, which have 0, 1, 1, 2, 1 and 2 set bits."
      }
    ],
    "functionName": "countBits",
    "params": ["n"],
    "starterCode": {
      "javascript": "function countBits(n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def countBits(self, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> countBits(int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [2],
        "expected": [0,1,1]
      },
      {
        "input": [5],
        "expected": [0,1,1,2,1,2]
      }
    ]
  },
  {
    "id": "reverse-bits",
    "title": "Reverse Bits",
    "slug": "reverse-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Reverse the bits of a **32-bit unsigned integer** `n` and return the result as an unsigned integer.\n\nFor example, the 32-bit input `00000010100101000001111010011100` becomes `00111001011110000010100101000000`.",
    "constraints": ["0 <= n <= 2^32 - 1"],
    "examples": [
      {
        "input": "n = 43261596",
        "output": "964176192",
        "explanation": "43261596 reversed bit by bit is 964176192."
      },
      {
        "input": "n = 4294967293",
        "output": "3221225471",
        "explanation": "4294967293 reversed bit by bit is 3221225471."
      }
    ],
    "functionName": "reverseBits",
    "params": ["n"],
    "starterCode": {
      "javascript": "function reverseBits(n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def reverseBits(self, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    uint32_t reverseBits(uint32_t n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [43261596],
        "expected": 964176192
      },
      {
        "input": [4294967293],
        "expected": 3221225471
      }
    ]
  },
  {
    "id": "missing-number",
    "title": "Missing Number",
    "slug": "missing-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "Given an array `nums` containing `n` **distinct** numbers taken from the range `[0, n]`, return the **one number in that range that is missing** from the array.",
    "constraints": ["n == nums.length","1 <= n <= 10^4","0 <= nums[i] <= n","All the numbers of nums are unique"],
    "examples": [
      {
        "input": "nums = [3,0,1]",
        "output": "2",
        "explanation": "n = 3, so the range is [0, 3]. The number 2 is missing."
      },
      {
        "input": "nums = [0,1]",
        "output": "2",
        "explanation": "n = 2, so the range is [0, 2]. The number 2 is missing."
      },
      {
        "input": "nums = [9,6,4,2,3,5,7,0,1]",
        "output": "8",
        "explanation": "n = 9, so the range is [0, 9]. The number 8 is missing."
      }
    ],
    "functionName": "missingNumber",
    "params": ["nums"],
    "starterCode": {
      "javascript": "function missingNumber(nums) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def missingNumber(self, nums):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int missingNumber(vector<int>& nums) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[3,0,1]],
        "expected": 2
      },
      {
        "input": [[0,1]],
        "expected": 2
      },
      {
        "input": [[9,6,4,2,3,5,7,0,1]],
        "expected": 8
      }
    ]
  },
  {
    "id": "sum-of-two-integers",
    "title": "Sum of Two Integers",
    "slug": "sum-of-two-integers",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "Given two integers `a` and `b`, return their **sum** without using the operators `+` and `-`.\n\nHint: think about how a computer adds binary numbers with XOR and carry.",
    "constraints": ["-1000 <= a, b <= 1000"],
    "examples": [
      {
        "input": "a = 1, b = 2",
        "output": "3",
        "explanation": "1 + 2 = 3."
      },
      {
        "input": "a = 2, b = 3",
        "output": "5",
        "explanation": "2 + 3 = 5."
      }
    ],
    "functionName": "getSum",
    "params": ["a","b"],
    "starterCode": {
      "javascript": "function getSum(a, b) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def getSum(self, a, b):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int getSum(int a, int b) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [1,2],
        "expected": 3
      },
      {
        "input": [2,3],
        "expected": 5
      }
    ]
  },
  {
    "id": "reverse-integer",
    "title": "Reverse Integer",
    "slug": "reverse-integer",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given a signed 32-bit integer `x`, return `x` with its **digits reversed**. If reversing makes the value go outside the signed 32-bit range `[-2^31, 2^31 - 1]`, return `0`.\n\nAssume the environment does not let you store 64-bit integers.",
    "constraints": ["-2^31 <= x <= 2^31 - 1"],
    "examples": [
      {
        "input": "x = 123",
        "output": "321",
        "explanation": "Reversing 123 gives 321."
      },
      {
        "input": "x = -123",
        "output": "-321",
        "explanation": "The sign is kept: -123 becomes -321."
      },
      {
        "input": "x = 120",
        "output": "21",
        "explanation": "Trailing zeros disappear: 120 becomes 21."
      }
    ],
    "functionName": "reverse",
    "params": ["x"],
    "starterCode": {
      "javascript": "function reverse(x) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def reverse(self, x):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int reverse(long long x) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [123],
        "expected": 321
      },
      {
        "input": [-123],
        "expected": -321
      },
      {
        "input": [120],
        "expected": 21
      }
    ]
  },
  {
    "id": "palindrome-number",
    "title": "Palindrome Number",
    "slug": "palindrome-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Amazon","Bloomberg","Adobe"],
    "acceptanceRate": "",
    "description": "Given an integer `x`, return `true` if `x` is a **palindrome** (it reads the same forwards and backwards), and `false` otherwise.\n\nTry to solve it without converting the integer to a string.",
    "constraints": ["-2^31 <= x <= 2^31 - 1"],
    "examples": [
      {
        "input": "x = 121",
        "output": "true",
        "explanation": "121 reads the same in both directions."
      },
      {
        "input": "x = -121",
        "output": "false",
        "explanation": "Read backwards it becomes 121-, so it is not a palindrome."
      }
    ],
    "functionName": "isPalindrome",
    "params": ["x"],
    "starterCode": {
      "javascript": "function isPalindrome(x) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def isPalindrome(self, x):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    bool isPalindrome(int x) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [121],
        "expected": true
      },
      {
        "input": [-121],
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
    "companies": ["Meta","Netflix","ByteDance"],
    "acceptanceRate": "",
    "description": "Roman numerals use the symbols `I` (1), `V` (5), `X` (10), `L` (50), `C` (100), `D` (500) and `M` (1000). Symbols are normally written from largest to smallest and added together, except that a smaller symbol **before** a larger one is subtracted:\n\n- `I` before `V` or `X` makes 4 and 9,\n- `X` before `L` or `C` makes 40 and 90,\n- `C` before `D` or `M` makes 400 and 900.\n\nGiven a Roman numeral `s`, convert it to an integer.",
    "constraints": ["1 <= s.length <= 15","s contains only the characters I, V, X, L, C, D and M","s is a valid Roman numeral in the range [1, 3999]"],
    "examples": [
      {
        "input": "s = \"III\"",
        "output": "3",
        "explanation": "III = 3."
      },
      {
        "input": "s = \"LVIII\"",
        "output": "58",
        "explanation": "L = 50, V = 5 and III = 3."
      },
      {
        "input": "s = \"MCMXCIV\"",
        "output": "1994",
        "explanation": "M = 1000, CM = 900, XC = 90 and IV = 4."
      }
    ],
    "functionName": "romanToInt",
    "params": ["s"],
    "starterCode": {
      "javascript": "function romanToInt(s) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def romanToInt(self, s):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int romanToInt(string s) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["III"],
        "expected": 3
      },
      {
        "input": ["LVIII"],
        "expected": 58
      },
      {
        "input": ["MCMXCIV"],
        "expected": 1994
      }
    ]
  },
  {
    "id": "integer-to-roman",
    "title": "Integer to Roman",
    "slug": "integer-to-roman",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": ["Google","Apple","Microsoft","Amazon"],
    "acceptanceRate": "",
    "description": "Convert the integer `num` to a **Roman numeral**.\n\nRoman numerals use the symbols `I` (1), `V` (5), `X` (10), `L` (50), `C` (100), `D` (500) and `M` (1000). Write the value from the largest symbol down, using the subtractive forms `IV` (4), `IX` (9), `XL` (40), `XC` (90), `CD` (400) and `CM` (900) where they apply. A symbol is never repeated more than three times in a row.",
    "constraints": ["1 <= num <= 3999"],
    "examples": [
      {
        "input": "num = 3",
        "output": "\"III\"",
        "explanation": "3 is three ones."
      },
      {
        "input": "num = 58",
        "output": "\"LVIII\"",
        "explanation": "58 is L + V + III."
      },
      {
        "input": "num = 1994",
        "output": "\"MCMXCIV\"",
        "explanation": "1994 is M + CM + XC + IV."
      }
    ],
    "functionName": "intToRoman",
    "params": ["num"],
    "starterCode": {
      "javascript": "function intToRoman(num) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def intToRoman(self, num):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    string intToRoman(int num) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [3],
        "expected": "III"
      },
      {
        "input": [58],
        "expected": "LVIII"
      },
      {
        "input": [1994],
        "expected": "MCMXCIV"
      }
    ]
  },
  {
    "id": "powx-n",
    "title": "Pow(x, n)",
    "slug": "powx-n",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": ["Stripe","Airbnb","Salesforce"],
    "acceptanceRate": "",
    "description": "Implement `pow(x, n)`, which raises the number `x` to the integer power `n` and returns `x^n`.\n\nAnswers within `10^-5` of the exact value are accepted. Try to use **fast exponentiation** so that large exponents finish quickly.",
    "constraints": ["-100.0 < x < 100.0","-2^31 <= n <= 2^31 - 1","n is an integer","Either x is not zero or n > 0","-10^4 <= x^n <= 10^4"],
    "examples": [
      {
        "input": "x = 2, n = 10",
        "output": "1024",
        "explanation": "2 to the 10th power is 1024."
      },
      {
        "input": "x = 2.1, n = 3",
        "output": "9.261000000000001",
        "explanation": "2.1 cubed is 9.261."
      },
      {
        "input": "x = 2, n = -2",
        "output": "0.25",
        "explanation": "A negative exponent means a reciprocal: 2^-2 = 1 / 4 = 0.25."
      }
    ],
    "functionName": "myPow",
    "params": ["x","n"],
    "compare": "float",
    "starterCode": {
      "javascript": "function myPow(x, n) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def myPow(self, x, n):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    double myPow(double x, int n) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [2,10],
        "expected": 1024
      },
      {
        "input": [2.1,3],
        "expected": 9.261000000000001
      },
      {
        "input": [2,-2],
        "expected": 0.25
      }
    ]
  },
  {
    "id": "sqrtx",
    "title": "Sqrt(x)",
    "slug": "sqrtx",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Oracle","Cisco","PayPal"],
    "acceptanceRate": "",
    "description": "Given a non-negative integer `x`, return the **square root of `x` rounded down** to the nearest integer. The result must be non-negative.\n\nYou must not use any built-in exponent function or operator such as `pow(x, 0.5)` or `x ** 0.5`.",
    "constraints": ["0 <= x <= 2^31 - 1"],
    "examples": [
      {
        "input": "x = 4",
        "output": "2",
        "explanation": "The square root of 4 is exactly 2."
      },
      {
        "input": "x = 8",
        "output": "2",
        "explanation": "The square root of 8 is about 2.83, which rounds down to 2."
      }
    ],
    "functionName": "mySqrt",
    "params": ["x"],
    "starterCode": {
      "javascript": "function mySqrt(x) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def mySqrt(self, x):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    int mySqrt(int x) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [4],
        "expected": 2
      },
      {
        "input": [8],
        "expected": 2
      }
    ]
  },
  {
    "id": "plus-one",
    "title": "Plus One",
    "slug": "plus-one",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Google","Amazon","Meta"],
    "acceptanceRate": "",
    "description": "You are given a **large integer** as an array `digits`, where `digits[i]` is the `i`th digit and the digits are ordered from most significant to least significant. The number has no leading zeros.\n\nAdd **one** to the integer and return the resulting array of digits.",
    "constraints": ["1 <= digits.length <= 100","0 <= digits[i] <= 9","digits does not contain leading zeros"],
    "examples": [
      {
        "input": "digits = [1,2,3]",
        "output": "[1,2,4]",
        "explanation": "The array represents 123, and 123 + 1 = 124."
      },
      {
        "input": "digits = [4,3,2,1]",
        "output": "[4,3,2,2]",
        "explanation": "The array represents 4321, and 4321 + 1 = 4322."
      },
      {
        "input": "digits = [9]",
        "output": "[1,0]",
        "explanation": "The array represents 9, and 9 + 1 = 10."
      }
    ],
    "functionName": "plusOne",
    "params": ["digits"],
    "starterCode": {
      "javascript": "function plusOne(digits) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def plusOne(self, digits):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    vector<int> plusOne(vector<int>& digits) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [[1,2,3]],
        "expected": [1,2,4]
      },
      {
        "input": [[4,3,2,1]],
        "expected": [4,3,2,2]
      },
      {
        "input": [[9]],
        "expected": [1,0]
      }
    ]
  },
  {
    "id": "add-binary",
    "title": "Add Binary",
    "slug": "add-binary",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": ["Microsoft","Apple","Uber"],
    "acceptanceRate": "",
    "description": "Given two binary strings `a` and `b`, return their **sum as a binary string**.",
    "constraints": ["1 <= a.length, b.length <= 10^4","a and b consist only of the characters \"0\" and \"1\"","Each string contains no leading zeros, except for the string \"0\" itself"],
    "examples": [
      {
        "input": "a = \"11\", b = \"1\"",
        "output": "\"100\"",
        "explanation": "1 + 1 carries into a new digit: 11 + 1 = 100."
      },
      {
        "input": "a = \"1010\", b = \"1011\"",
        "output": "\"10101\"",
        "explanation": "1010 + 1011 = 10101."
      }
    ],
    "functionName": "addBinary",
    "params": ["a","b"],
    "starterCode": {
      "javascript": "function addBinary(a, b) {\n  // Write your solution here\n}",
      "python": "class Solution:\n    def addBinary(self, a, b):\n        # Write your solution here\n        pass",
      "cpp": "class Solution {\npublic:\n    string addBinary(string a, string b) {\n        // Write your solution here\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": ["11","1"],
        "expected": "100"
      },
      {
        "input": ["1010","1011"],
        "expected": "10101"
      }
    ]
  }
];

export const TOPICS: string[] = [
  'All',
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Linked List',
  'Trees & Graphs',
  'Dynamic Programming',
  'Backtracking & Heaps',
  'Math & Bit Manipulation'
];

export const COMPANIES: string[] = [
  'All',
  'Google',
  'Amazon',
  'Meta',
  'Apple',
  'Microsoft',
  'Bloomberg',
  'Uber',
  'Netflix',
  'Stripe',
  'Airbnb',
  'Spotify',
  'Adobe',
  'ByteDance'
];
