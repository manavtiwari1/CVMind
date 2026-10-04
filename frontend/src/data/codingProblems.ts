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
    "companies": [],
    "acceptanceRate": "",
    "description": "A shop lists its item prices in `nums`, and you hold a gift card worth exactly `target`. Pick **two different items whose prices add up to `target`** and return their positions (0-based) as a two-element array.\n\nEvery input has exactly one such pair, and an item cannot be picked twice. The two positions may come back in either order.",
    "constraints": ["2 <= nums.length <= 10^4","-10^9 <= nums[i], target <= 10^9","Exactly one pair reaches target"],
    "examples": [
      {
        "input": "nums = [4,9,1,7], target = 10",
        "output": "[1,2]",
        "explanation": "9 + 1 = 10, and those prices sit at positions 1 and 2."
      },
      {
        "input": "nums = [5,-3,8,12], target = 9",
        "output": "[1,3]",
        "explanation": "-3 + 12 = 9, at positions 1 and 3."
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
        "input": [[4,9,1,7],10],
        "expected": [1,2]
      },
      {
        "input": [[5,-3,8,12],9],
        "expected": [1,3]
      }
    ]
  },
  {
    "id": "valid-anagram",
    "title": "Valid Anagram",
    "slug": "valid-anagram",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "Two words are **anagrams** when one can be turned into the other just by reordering its letters, with every letter used exactly as many times as it appears.\n\nReturn `true` if `s` and `t` are anagrams of each other, and `false` otherwise.",
    "constraints": ["1 <= s.length, t.length <= 5 * 10^4","Both strings use only lowercase English letters"],
    "examples": [
      {
        "input": "s = \"night\", t = \"thing\"",
        "output": "true",
        "explanation": "Both words use g, h, i, n and t exactly once."
      },
      {
        "input": "s = \"apple\", t = \"paper\"",
        "output": "false",
        "explanation": "\"apple\" has an \"l\" that \"paper\" does not."
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
        "input": ["night","thing"],
        "expected": true
      },
      {
        "input": ["apple","paper"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "A ticket scanner records the ticket numbers it sees in `nums`. Return `true` if **some ticket number was scanned more than once**, and `false` if all of them are different.",
    "constraints": ["1 <= nums.length <= 10^5","-10^9 <= nums[i] <= 10^9"],
    "examples": [
      {
        "input": "nums = [7,3,9,3]",
        "output": "true",
        "explanation": "Ticket 3 was scanned twice."
      },
      {
        "input": "nums = [10,20,30]",
        "output": "false",
        "explanation": "All three tickets are different."
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
        "input": [[7,3,9,3]],
        "expected": true
      },
      {
        "input": [[10,20,30]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Sort the words in `strs` into groups so that **two words share a group exactly when they are anagrams** (made of the same letters, the same number of times). Return the list of groups.\n\nThe groups, and the words inside each group, may be returned in any order.",
    "constraints": ["1 <= strs.length <= 10^4","0 <= strs[i].length <= 100","Words use only lowercase English letters"],
    "examples": [
      {
        "input": "strs = [\"dusty\",\"night\",\"act\",\"study\",\"thing\",\"cat\"]",
        "output": "[[\"dusty\",\"study\"],[\"night\",\"thing\"],[\"act\",\"cat\"]]",
        "explanation": "\"dusty\"/\"study\", \"night\"/\"thing\" and \"act\"/\"cat\" each form a pair."
      },
      {
        "input": "strs = [\"abc\",\"x\"]",
        "output": "[[\"abc\"],[\"x\"]]",
        "explanation": "Words with different letters stay in separate groups."
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
        "input": [["dusty","night","act","study","thing","cat"]],
        "expected": [["dusty","study"],["night","thing"],["act","cat"]]
      },
      {
        "input": [["abc","x"]],
        "expected": [["abc"],["x"]]
      }
    ]
  },
  {
    "id": "top-k-frequent-elements",
    "title": "Top K Frequent Elements",
    "slug": "top-k-frequent-elements",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` is a log of product ids, one per sale. Return the **`k` ids that were sold most often**, in any order.\n\nThe inputs are chosen so the answer is unambiguous: nothing outside the answer ties with the `k`th best seller.",
    "constraints": ["1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4","k is between 1 and the number of distinct ids","The answer is unique"],
    "examples": [
      {
        "input": "nums = [7,7,8,8,8,9], k = 1",
        "output": "[8]",
        "explanation": "8 was sold three times, more than any other id."
      },
      {
        "input": "nums = [4,4,5,5,5,6,6,6,6], k = 2",
        "output": "[6,5]",
        "explanation": "6 sold four times and 5 sold three times."
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
        "input": [[7,7,8,8,8,9],1],
        "expected": [8]
      },
      {
        "input": [[4,4,5,5,5,6,6,6,6],2],
        "expected": [6,5]
      }
    ]
  },
  {
    "id": "product-of-array-except-self",
    "title": "Product of Array Except Self",
    "slug": "product-of-array-except-self",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "For each position `i` of `nums`, work out what you get by **multiplying every other number together**, leaving `nums[i]` out. Return these results as an array of the same length.\n\nAim for **O(n)** time, and do not use division.",
    "constraints": ["2 <= nums.length <= 10^5","-30 <= nums[i] <= 30","Every prefix and suffix product fits in a 32-bit integer"],
    "examples": [
      {
        "input": "nums = [2,5,3]",
        "output": "[15,6,10]",
        "explanation": "5 x 3 = 15, 2 x 3 = 6 and 2 x 5 = 10."
      },
      {
        "input": "nums = [3,0,4,2]",
        "output": "[0,24,0,0]",
        "explanation": "Only the position holding the zero avoids multiplying by zero: 3 x 4 x 2 = 24."
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
        "input": [[2,5,3]],
        "expected": [15,6,10]
      },
      {
        "input": [[3,0,4,2]],
        "expected": [0,24,0,0]
      }
    ]
  },
  {
    "id": "longest-consecutive-sequence",
    "title": "Longest Consecutive Sequence",
    "slug": "longest-consecutive-sequence",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "Pages fell out of a book and were picked up in random order; `nums` holds their page numbers. Find the **longest stretch of back-to-back page numbers** (like 7, 8, 9) you can assemble and return how many pages it has.\n\nThe numbers can be anywhere in the array, and repeats count once. Aim for **O(n)** time.",
    "constraints": ["0 <= nums.length <= 10^5","-10^9 <= nums[i] <= 10^9"],
    "examples": [
      {
        "input": "nums = [10,5,12,3,11,4,13]",
        "output": "4",
        "explanation": "10, 11, 12, 13 is the longest stretch."
      },
      {
        "input": "nums = [9,1,-1,0,8]",
        "output": "3",
        "explanation": "-1, 0, 1 beats 8, 9."
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
        "input": [[10,5,12,3,11,4,13]],
        "expected": 4
      },
      {
        "input": [[9,1,-1,0,8]],
        "expected": 3
      }
    ]
  },
  {
    "id": "maximum-subarray",
    "title": "Maximum Subarray (Kadane’s)",
    "slug": "maximum-subarray",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` holds a trader's profit (or loss, when negative) for each day. Choose **one unbroken run of at least one day** and return the biggest total profit such a run can have.",
    "constraints": ["1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "nums = [3,-4,5,-1,2,-6,4]",
        "output": "6",
        "explanation": "Days 3 to 5 give 5 - 1 + 2 = 6."
      },
      {
        "input": "nums = [-7]",
        "output": "-7",
        "explanation": "With one day, its value is the answer, even when negative."
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
        "input": [[3,-4,5,-1,2,-6,4]],
        "expected": 6
      },
      {
        "input": [[-7]],
        "expected": -7
      }
    ]
  },
  {
    "id": "majority-element",
    "title": "Majority Element",
    "slug": "majority-element",
    "difficulty": "Easy",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "An election's ballots are listed in `nums`, one candidate id per ballot. One candidate won **more than half of all the ballots**. Return that candidate's id.",
    "constraints": ["n == nums.length","1 <= n <= 5 * 10^4","-10^9 <= nums[i] <= 10^9","Some value fills more than half the array"],
    "examples": [
      {
        "input": "nums = [4,9,4]",
        "output": "4",
        "explanation": "4 got two of the three ballots."
      },
      {
        "input": "nums = [1,8,8,2,8]",
        "output": "8",
        "explanation": "8 got three of the five ballots."
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
        "input": [[4,9,4]],
        "expected": 4
      },
      {
        "input": [[1,8,8,2,8]],
        "expected": 8
      }
    ]
  },
  {
    "id": "sort-colors",
    "title": "Sort Colors (Dutch National Flag)",
    "slug": "sort-colors",
    "difficulty": "Medium",
    "category": "Arrays & Hashing",
    "companies": [],
    "acceptanceRate": "",
    "description": "A conveyor carries parcels tagged `0` (express), `1` (standard) or `2` (economy), listed in `nums`. Rearrange them so **all 0s come first, then all 1s, then all 2s**, and return the result.\n\nDo it **without a library sort**; one pass over the array is enough.",
    "constraints": ["n == nums.length","1 <= n <= 300","Every value is 0, 1 or 2"],
    "examples": [
      {
        "input": "nums = [1,2,0,0,2]",
        "output": "[0,0,1,2,2]",
        "explanation": "Both 0s move to the front and both 2s to the back."
      },
      {
        "input": "nums = [2,1]",
        "output": "[1,2]",
        "explanation": "The 1 moves ahead of the 2."
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
        "input": [[1,2,0,0,2]],
        "expected": [0,0,1,2,2]
      },
      {
        "input": [[2,1]],
        "expected": [1,2]
      }
    ]
  },
  {
    "id": "valid-palindrome",
    "title": "Valid Palindrome",
    "slug": "valid-palindrome",
    "difficulty": "Easy",
    "category": "Two Pointers",
    "companies": [],
    "acceptanceRate": "",
    "description": "Ignore case, and throw away everything in `s` that is not a letter or a digit. Return `true` if **what is left reads the same from both ends**, and `false` otherwise.",
    "constraints": ["1 <= s.length <= 2 * 10^5","s contains printable ASCII characters only"],
    "examples": [
      {
        "input": "s = \"Was it a car or a cat I saw?\"",
        "output": "true",
        "explanation": "Cleaned up, it is \"wasitacaroracatisaw\", the same backwards."
      },
      {
        "input": "s = \"Step on no cats\"",
        "output": "false",
        "explanation": "\"steponnocats\" reversed is \"stacnonopets\"."
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
        "input": ["Was it a car or a cat I saw?"],
        "expected": true
      },
      {
        "input": ["Step on no cats"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`numbers` is already **sorted from smallest to largest**. Find the two entries that add up to `target` and return their positions **counting from 1**, smaller position first.\n\nThere is exactly one such pair, and one entry cannot be used twice. Solve it with **O(1) extra memory**.",
    "constraints": ["2 <= numbers.length <= 3 * 10^4","-1000 <= numbers[i], target <= 1000","numbers never decreases","Exactly one pair reaches target"],
    "examples": [
      {
        "input": "numbers = [1,3,4,8,10], target = 12",
        "output": "[3,4]",
        "explanation": "4 + 8 = 12, at positions 3 and 4."
      },
      {
        "input": "numbers = [-5,-2,0,6], target = -2",
        "output": "[2,3]",
        "explanation": "-2 + 0 = -2, at positions 2 and 3."
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
        "input": [[1,3,4,8,10],12],
        "expected": [3,4]
      },
      {
        "input": [[-5,-2,0,6],-2],
        "expected": [2,3]
      }
    ]
  },
  {
    "id": "3sum",
    "title": "3Sum",
    "slug": "3sum",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": [],
    "acceptanceRate": "",
    "description": "Find every way to **pick three entries of `nums` (at three different positions) whose values sum to zero**. Return the distinct value triples: two triples with the same three values count once.\n\nTriples, and the values inside each, can be in any order.",
    "constraints": ["3 <= nums.length <= 3000","-10^5 <= nums[i] <= 10^5"],
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[]",
        "explanation": "All values are positive, so nothing sums to zero."
      },
      {
        "input": "nums = [-3,1,2,0]",
        "output": "[[-3,1,2]]",
        "explanation": "-3 + 1 + 2 = 0 is the only zero-sum triple."
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
        "input": [[1,2,3]],
        "expected": []
      },
      {
        "input": [[-3,1,2,0]],
        "expected": [[-3,1,2]]
      }
    ]
  },
  {
    "id": "container-with-most-water",
    "title": "Two Fence Posts",
    "slug": "two-fence-posts",
    "difficulty": "Medium",
    "category": "Two Pointers",
    "companies": [],
    "acceptanceRate": "",
    "description": "Fence posts stand one metre apart along a ditch; post `i` is `height[i]` metres tall. A tarp stretched between **any two posts** holds water up to the shorter post, so the pair at positions `i < j` holds `min(height[i], height[j]) * (j - i)`.\n\nReturn the **most water any pair of posts can hold**.",
    "constraints": ["n == height.length","2 <= n <= 10^5","0 <= height[i] <= 10^4"],
    "examples": [
      {
        "input": "height = [3,1,6,2,5]",
        "output": "12",
        "explanation": "Posts 0 and 4 hold min(3, 5) x 4 = 12."
      },
      {
        "input": "height = [2,2]",
        "output": "2",
        "explanation": "The only pair holds min(2, 2) x 1 = 2."
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
        "input": [[3,1,6,2,5]],
        "expected": 12
      },
      {
        "input": [[2,2]],
        "expected": 2
      }
    ]
  },
  {
    "id": "trapping-rain-water",
    "title": "Puddles Between Pillars",
    "slug": "puddles-between-pillars",
    "difficulty": "Hard",
    "category": "Two Pointers",
    "companies": [],
    "acceptanceRate": "",
    "description": "A row of stone pillars, each one unit wide, has heights `height`. After a storm, water collects in every dip that has a taller pillar somewhere on **both** sides; water above a pillar rises to the lower of the tallest pillars to its left and right.\n\nReturn the **total units of water** left standing on the pillars.",
    "constraints": ["n == height.length","1 <= n <= 2 * 10^4","0 <= height[i] <= 10^5"],
    "examples": [
      {
        "input": "height = [3,0,2,0,4]",
        "output": "7",
        "explanation": "3 + 1 + 3 = 7 units sit between the walls of height 3 and 4."
      },
      {
        "input": "height = [2,1,3,1,2]",
        "output": "2",
        "explanation": "Each of the two dips of height 1 holds one unit."
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
        "input": [[3,0,2,0,4]],
        "expected": 7
      },
      {
        "input": [[2,1,3,1,2]],
        "expected": 2
      }
    ]
  },
  {
    "id": "move-zeroes",
    "title": "Move Zeroes",
    "slug": "move-zeroes",
    "difficulty": "Easy",
    "category": "Two Pointers",
    "companies": [],
    "acceptanceRate": "",
    "description": "Shift **every zero in `nums` to the back** of the array. The other numbers must stay in the order they started in. Return the rearranged array.\n\nTry to do it in place, without building a second array.",
    "constraints": ["1 <= nums.length <= 10^4","-2^31 <= nums[i] <= 2^31 - 1"],
    "examples": [
      {
        "input": "nums = [5,0,0,7,2]",
        "output": "[5,7,2,0,0]",
        "explanation": "5, 7, 2 keep their order; both zeros go to the back."
      },
      {
        "input": "nums = [0,9]",
        "output": "[9,0]",
        "explanation": "The zero moves behind the 9."
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
        "input": [[5,0,0,7,2]],
        "expected": [5,7,2,0,0]
      },
      {
        "input": [[0,9]],
        "expected": [9,0]
      }
    ]
  },
  {
    "id": "best-time-to-buy-and-sell-stock",
    "title": "Best Time to Buy and Sell Stock",
    "slug": "best-time-to-buy-and-sell-stock",
    "difficulty": "Easy",
    "category": "Sliding Window",
    "companies": [],
    "acceptanceRate": "",
    "description": "`prices[i]` is what one share of a stock costs on day `i`. You may **buy one share on some day and sell it on a later day**, at most once.\n\nReturn the largest profit this single trade can make, or `0` if every possible trade loses money.",
    "constraints": ["1 <= prices.length <= 10^5","0 <= prices[i] <= 10^4"],
    "examples": [
      {
        "input": "prices = [9,4,6,2,8,3]",
        "output": "6",
        "explanation": "Buy at 2 on day 3 and sell at 8 on day 4 for a profit of 6."
      },
      {
        "input": "prices = [8,5,5,2]",
        "output": "0",
        "explanation": "The price never rises after a buy, so the best is to not trade."
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
        "input": [[9,4,6,2,8,3]],
        "expected": 6
      },
      {
        "input": [[8,5,5,2]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Return the length of the **longest unbroken stretch of `s` in which no character appears twice**.\n\nThe stretch must be contiguous: you cannot skip characters.",
    "constraints": ["0 <= s.length <= 5 * 10^4","s may contain letters, digits, symbols and spaces"],
    "examples": [
      {
        "input": "s = \"xyzxyw\"",
        "output": "4",
        "explanation": "\"zxyw\" has four different characters; any longer stretch repeats one."
      },
      {
        "input": "s = \"qqqq\"",
        "output": "1",
        "explanation": "With only one distinct character, the best stretch is one long."
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
        "input": ["xyzxyw"],
        "expected": 4
      },
      {
        "input": ["qqqq"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`s` is a string of capital letters. You may **repaint at most `k` of its characters**, turning each into any capital letter you like.\n\nAfter repainting, what is the longest stretch of `s` in which every character is the same letter? Return its length.",
    "constraints": ["1 <= s.length <= 10^5","s uses only capital English letters","0 <= k <= s.length"],
    "examples": [
      {
        "input": "s = \"XYYX\", k = 1",
        "output": "3",
        "explanation": "Repaint one \"X\" to get \"YYY\" next to the other letter; four in a row would need two repaints."
      },
      {
        "input": "s = \"MMNMM\", k = 1",
        "output": "5",
        "explanation": "Repaint the \"N\" and the whole string is \"M\"."
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
        "input": ["XYYX",1],
        "expected": 3
      },
      {
        "input": ["MMNMM",1],
        "expected": 5
      }
    ]
  },
  {
    "id": "permutation-in-string",
    "title": "Permutation in String",
    "slug": "permutation-in-string",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [],
    "acceptanceRate": "",
    "description": "Return `true` if `s2` has a stretch of exactly `s1.length` characters that **uses the same letters as `s1`, just possibly shuffled**. Otherwise return `false`.",
    "constraints": ["1 <= s1.length, s2.length <= 10^4","Both strings use only lowercase English letters"],
    "examples": [
      {
        "input": "s1 = \"xy\", s2 = \"abyxc\"",
        "output": "true",
        "explanation": "\"yx\" appears in s2 and is \"xy\" reordered."
      },
      {
        "input": "s1 = \"xy\", s2 = \"axcyb\"",
        "output": "false",
        "explanation": "\"x\" and \"y\" never sit next to each other in s2."
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
        "input": ["xy","abyxc"],
        "expected": true
      },
      {
        "input": ["xy","axcyb"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Find the **shortest stretch of `s` that contains every character of `t`**, counting repeats (if `t` has two `a`s, the stretch needs two `a`s). Return that stretch, or `\"\"` if none exists.\n\nWhen several shortest stretches exist, return the leftmost one.",
    "constraints": ["1 <= s.length, t.length <= 10^5","Both strings use only English letters (either case)"],
    "examples": [
      {
        "input": "s = \"XAYBZAXC\", t = \"ABC\"",
        "output": "\"BZAXC\"",
        "explanation": "\"BZAXC\" holds an A, a B and a C, and no shorter stretch does."
      },
      {
        "input": "s = \"q\", t = \"qq\"",
        "output": "\"\"",
        "explanation": "There is only one \"q\" to cover the two in t."
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
        "input": ["XAYBZAXC","ABC"],
        "expected": "BZAXC"
      },
      {
        "input": ["q","qq"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "A window exactly `k` numbers wide starts at the left end of `nums` and slides right one step at a time until it reaches the right end.\n\nReturn the **largest number inside the window at each of its positions**, in order.",
    "constraints": ["1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4","1 <= k <= nums.length"],
    "examples": [
      {
        "input": "nums = [2,7,3,1,8,4], k = 3",
        "output": "[7,7,8,8]",
        "explanation": "Windows [2 7 3], [7 3 1], [3 1 8] and [1 8 4] peak at 7, 7, 8 and 8."
      },
      {
        "input": "nums = [5,-2], k = 1",
        "output": "[5,-2]",
        "explanation": "With k = 1 every number is its own window."
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
        "input": [[2,7,3,1,8,4],3],
        "expected": [7,7,8,8]
      },
      {
        "input": [[5,-2],1],
        "expected": [5,-2]
      }
    ]
  },
  {
    "id": "find-all-anagrams-in-a-string",
    "title": "Find All Anagrams in a String",
    "slug": "find-all-anagrams-in-a-string",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [],
    "acceptanceRate": "",
    "description": "Slide over `s` looking at every stretch that is as long as `p`. Return the **starting positions of the stretches that are rearrangements of `p`**, from left to right.",
    "constraints": ["1 <= s.length, p.length <= 3 * 10^4","Both strings use only lowercase English letters"],
    "examples": [
      {
        "input": "s = \"xyzzyxz\", p = \"xyz\"",
        "output": "[0,3,4]",
        "explanation": "\"xyz\" at 0, \"zyx\" at 3 and \"yxz\" at 4 all use x, y and z once."
      },
      {
        "input": "s = \"pqqp\", p = \"pq\"",
        "output": "[0,2]",
        "explanation": "\"pq\" at 0 and \"qp\" at 2 match; \"qq\" at 1 does not."
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
        "input": ["xyzzyxz","xyz"],
        "expected": [0,3,4]
      },
      {
        "input": ["pqqp","pq"],
        "expected": [0,2]
      }
    ]
  },
  {
    "id": "minimum-size-subarray-sum",
    "title": "Minimum Size Subarray Sum",
    "slug": "minimum-size-subarray-sum",
    "difficulty": "Medium",
    "category": "Sliding Window",
    "companies": [],
    "acceptanceRate": "",
    "description": "Every number in `nums` is **positive**. Find the **shortest unbroken run of numbers whose total is at least `target`** and return how many numbers it has.\n\nReturn `0` if even the whole array falls short.",
    "constraints": ["1 <= target <= 10^9","1 <= nums.length <= 10^5","1 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "target = 9, nums = [1,4,2,5,3]",
        "output": "3",
        "explanation": "4 + 2 + 5 = 11 reaches 9; no two neighbours add up to 9."
      },
      {
        "input": "target = 6, nums = [2,6,1]",
        "output": "1",
        "explanation": "The 6 alone is enough."
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
        "input": [9,[1,4,2,5,3]],
        "expected": 3
      },
      {
        "input": [6,[2,6,1]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`s` is made only of the bracket characters `( ) [ ] { }`. Return `true` if the brackets are **properly balanced**, and `false` otherwise.\n\nBalanced means each closing bracket closes the most recent bracket that is still open, the two are of the same kind, and nothing is left open at the end.",
    "constraints": ["1 <= s.length <= 10^4","s uses only the characters ()[]{}"],
    "examples": [
      {
        "input": "s = \"{[()]}\"",
        "output": "true",
        "explanation": "Each bracket closes the innermost one still open."
      },
      {
        "input": "s = \"[(])\"",
        "output": "false",
        "explanation": "The \"]\" arrives while \"(\" is the innermost open bracket."
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
        "input": ["{[()]}"],
        "expected": true
      },
      {
        "input": ["[(])"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Build a stack that can also report **the smallest value it currently holds**. Every operation must take **O(1)** time.\n\nImplement the `MinStack` class:\n\n- `MinStack()` starts with an empty stack.\n- `push(val)` places `val` on top.\n- `pop()` discards the top value.\n- `top()` returns the top value without removing it.\n- `getMin()` returns the smallest value anywhere in the stack.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["-2^31 <= val <= 2^31 - 1","pop, top and getMin are only called when the stack is not empty","At most 3 * 10^4 calls in total"],
    "examples": [
      {
        "input": "operations = [\"MinStack\",\"push\",\"push\",\"getMin\",\"push\",\"getMin\",\"pop\",\"getMin\",\"top\"], arguments = [[],[4],[7],[],[1],[],[],[],[]]",
        "output": "[null,null,null,4,null,1,null,4,7]",
        "explanation": "With 4 and 7 inside the minimum is 4. Pushing 1 lowers it to 1, and popping the 1 brings it back to 4, with 7 on top."
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
        "input": [["MinStack","push","push","getMin","push","getMin","pop","getMin","top"],[[],[4],[7],[],[1],[],[],[],[]]],
        "expected": [null,null,null,4,null,1,null,4,7]
      }
    ]
  },
  {
    "id": "evaluate-reverse-polish-notation",
    "title": "Evaluate Reverse Polish Notation",
    "slug": "evaluate-reverse-polish-notation",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [],
    "acceptanceRate": "",
    "description": "`tokens` is an arithmetic expression written in **postfix order**: each operator comes right after its two operands, so `3 4 +` means `3 + 4`. Compute its value.\n\n- Operators are `+`, `-`, `*` and `/`; everything else is an integer.\n- `/` is integer division that **drops the fractional part** (it rounds toward zero).\n- The expression is always well formed, never divides by zero, and stays within 32-bit integers.",
    "constraints": ["1 <= tokens.length <= 10^4","Each token is an operator or an integer from -200 to 200"],
    "examples": [
      {
        "input": "tokens = [\"6\",\"2\",\"-\",\"4\",\"*\"]",
        "output": "16",
        "explanation": "(6 - 2) * 4 = 16"
      },
      {
        "input": "tokens = [\"20\",\"3\",\"4\",\"+\",\"/\"]",
        "output": "2",
        "explanation": "20 / (3 + 4) = 2, since the fraction is dropped."
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
        "input": [["6","2","-","4","*"]],
        "expected": 16
      },
      {
        "input": [["20","3","4","+","/"]],
        "expected": 2
      }
    ]
  },
  {
    "id": "generate-parentheses",
    "title": "Generate Parentheses",
    "slug": "generate-parentheses",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [],
    "acceptanceRate": "",
    "description": "List **every balanced string made of `n` opening and `n` closing parentheses**. Balanced means that, reading left to right, you never close more parentheses than you have opened.\n\nReturn the strings in any order.",
    "constraints": ["1 <= n <= 8"],
    "examples": [
      {
        "input": "n = 2",
        "output": "[\"(())\",\"()()\"]",
        "explanation": "Two pairs can be nested or placed side by side."
      },
      {
        "input": "n = 1",
        "output": "[\"()\"]",
        "explanation": "One pair has a single arrangement."
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
        "input": [2],
        "expected": ["(())","()()"]
      },
      {
        "input": [1],
        "expected": ["()"]
      }
    ]
  },
  {
    "id": "daily-temperatures",
    "title": "Wait for a Warmer Day",
    "slug": "wait-for-a-warmer-day",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [],
    "acceptanceRate": "",
    "description": "`temperatures` is a forecast, one reading per day. For each day, count **how many days pass until a strictly warmer day arrives**, and return these counts as an array.\n\nUse `0` for days that are never followed by a warmer one.",
    "constraints": ["1 <= temperatures.length <= 10^5","30 <= temperatures[i] <= 100"],
    "examples": [
      {
        "input": "temperatures = [60,58,62,61,65]",
        "output": "[2,1,2,1,0]",
        "explanation": "Day 0 (60) waits two days for 62; day 2 (62) waits two days for 65."
      },
      {
        "input": "temperatures = [40,45,50]",
        "output": "[1,1,0]",
        "explanation": "Each day is beaten by the next, except the last."
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
        "input": [[60,58,62,61,65]],
        "expected": [2,1,2,1,0]
      },
      {
        "input": [[40,45,50]],
        "expected": [1,1,0]
      }
    ]
  },
  {
    "id": "car-fleet",
    "title": "Convoys on a Narrow Road",
    "slug": "convoys-on-a-narrow-road",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [],
    "acceptanceRate": "",
    "description": "Trucks travel one way along a road with no overtaking, all heading for a depot `target` km away. Truck `i` starts `position[i]` km along the road and drives at `speed[i]` km per hour.\n\nWhen a truck catches up with the one ahead, it slows down and they continue together as a **convoy**. Trucks that catch up exactly at the depot also count as one convoy.\n\nReturn **how many convoys reach the depot**.",
    "constraints": ["1 <= n <= 10^5","0 < target <= 10^6","0 <= position[i] < target, all different","0 < speed[i] <= 10^6"],
    "examples": [
      {
        "input": "target = 10, position = [6,2,0], speed = [2,4,1]",
        "output": "2",
        "explanation": "The trucks at 6 and 2 both need 2 hours, so they arrive together; the truck at 0 needs 10 hours and arrives alone."
      },
      {
        "input": "target = 15, position = [5], speed = [2]",
        "output": "1",
        "explanation": "One truck is one convoy."
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
        "input": [10,[6,2,0],[2,4,1]],
        "expected": 2
      },
      {
        "input": [15,[5],[2]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "A bar chart has bars of width `1` standing side by side, with heights `heights`. Draw an axis-aligned rectangle that **stays inside the bars** (it may span several neighbouring bars, but no higher than the shortest of them).\n\nReturn the **largest area** such a rectangle can have.",
    "constraints": ["1 <= heights.length <= 10^5","0 <= heights[i] <= 10^4"],
    "examples": [
      {
        "input": "heights = [3,1,4,4,2]",
        "output": "8",
        "explanation": "The two bars of height 4 give 4 x 2 = 8."
      },
      {
        "input": "heights = [3,5]",
        "output": "6",
        "explanation": "Both bars at height 3 give 6, more than the 5 alone."
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
        "input": [[3,1,4,4,2]],
        "expected": 8
      },
      {
        "input": [[3,5]],
        "expected": 6
      }
    ]
  },
  {
    "id": "asteroid-collision",
    "title": "Marbles on a Track",
    "slug": "marbles-on-a-track",
    "difficulty": "Medium",
    "category": "Stack",
    "companies": [],
    "acceptanceRate": "",
    "description": "Marbles roll along a straight track at the same speed. `asteroids[i]` describes marble `i` from left to right: its **absolute value is its weight**, and its **sign is its direction** (positive rolls right, negative rolls left).\n\nWhen a right-rolling marble meets a left-rolling one, the **lighter marble shatters**; if they weigh the same, **both shatter**. Marbles rolling the same way never touch.\n\nReturn the marbles that survive, from left to right.",
    "constraints": ["2 <= asteroids.length <= 10^4","-1000 <= asteroids[i] <= 1000","asteroids[i] != 0"],
    "examples": [
      {
        "input": "asteroids = [4,7,-3]",
        "output": "[4,7]",
        "explanation": "The -3 hits the 7 and shatters; the 4 is never reached."
      },
      {
        "input": "asteroids = [6,-6]",
        "output": "[]",
        "explanation": "Equal weights, so both shatter."
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
        "input": [[4,7,-3]],
        "expected": [4,7]
      },
      {
        "input": [[6,-6]],
        "expected": []
      }
    ]
  },
  {
    "id": "binary-search",
    "title": "Binary Search",
    "slug": "binary-search",
    "difficulty": "Easy",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` holds distinct integers in **increasing order**. Return the position of `target` in `nums`, or `-1` if it is missing.\n\nYour solution must take **O(log n)** time.",
    "constraints": ["1 <= nums.length <= 10^4","-10^4 < nums[i], target < 10^4","Values in nums are distinct and increasing"],
    "examples": [
      {
        "input": "nums = [-6,-2,1,4,7,15], target = 7",
        "output": "4",
        "explanation": "7 sits at position 4."
      },
      {
        "input": "nums = [-6,-2,1,4,7,15], target = 5",
        "output": "-1",
        "explanation": "There is no 5 in the array."
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
        "input": [[-6,-2,1,4,7,15],7],
        "expected": 4
      },
      {
        "input": [[-6,-2,1,4,7,15],5],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Read the grid `matrix` row by row, left to right, and the numbers **only ever increase**: each row is increasing, and every row starts above where the previous row ended.\n\nReturn `true` if `target` appears in the grid, otherwise `false`. Aim for **O(log(m * n))** time.",
    "constraints": ["m == matrix.length, n == matrix[i].length","1 <= m, n <= 100","-10^4 <= matrix[i][j], target <= 10^4"],
    "examples": [
      {
        "input": "matrix = [[2,4,8],[12,15,19],[25,31,40]], target = 15",
        "output": "true",
        "explanation": "15 sits in the middle row."
      },
      {
        "input": "matrix = [[2,4,8],[12,15,19],[25,31,40]], target = 9",
        "output": "false",
        "explanation": "9 would fall between 8 and 12, but it is not there."
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
        "input": [[[2,4,8],[12,15,19],[25,31,40]],15],
        "expected": true
      },
      {
        "input": [[[2,4,8],[12,15,19],[25,31,40]],9],
        "expected": false
      }
    ]
  },
  {
    "id": "koko-eating-bananas",
    "title": "Slowest Reading Pace",
    "slug": "slowest-reading-pace",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "A student must read a stack of reports before an exam in `h` hours; report `i` has `piles[i]` pages. They pick a pace of `k` pages per hour. In each hour they read up to `k` pages of **one** report, and if that report ends early they rest for the rest of the hour.\n\nReturn the **smallest whole-number pace `k`** that gets every report read within `h` hours.",
    "constraints": ["1 <= piles.length <= 10^4","piles.length <= h <= 10^9","1 <= piles[i] <= 10^9"],
    "examples": [
      {
        "input": "piles = [5,9,2,12], h = 7",
        "output": "5",
        "explanation": "At 5 pages an hour the reports take 1 + 2 + 1 + 3 = 7 hours; at 4 they would take 9."
      },
      {
        "input": "piles = [14,6,9], h = 3",
        "output": "14",
        "explanation": "Three hours for three reports: each must be read in one hour, so the pace must cover the longest."
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
        "input": [[5,9,2,12],7],
        "expected": 5
      },
      {
        "input": [[14,6,9],3],
        "expected": 14
      }
    ]
  },
  {
    "id": "find-minimum-in-rotated-sorted-array",
    "title": "Find Minimum in Rotated Sorted Array",
    "slug": "find-minimum-in-rotated-sorted-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` started as distinct integers in increasing order, then some number of elements were **moved from the front to the back** (possibly none, or all of them). For instance `[2,4,6,8,9]` could have become `[6,8,9,2,4]`.\n\nReturn the **smallest value** in `nums` in **O(log n)** time.",
    "constraints": ["1 <= nums.length <= 5000","-5000 <= nums[i] <= 5000","Values are distinct","nums is an increasing array after such a rotation"],
    "examples": [
      {
        "input": "nums = [6,8,9,2,4]",
        "output": "2",
        "explanation": "The sorted order restarts at 2."
      },
      {
        "input": "nums = [10,20,30]",
        "output": "10",
        "explanation": "Nothing was moved, so the first value is the smallest."
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
        "input": [[6,8,9,2,4]],
        "expected": 2
      },
      {
        "input": [[10,20,30]],
        "expected": 10
      }
    ]
  },
  {
    "id": "search-in-rotated-sorted-array",
    "title": "Search in Rotated Sorted Array",
    "slug": "search-in-rotated-sorted-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` is an increasing list of distinct integers that has been **cut at some point and had its two halves swapped**, so `[3,7,9,12,15,19]` might now read `[12,15,19,3,7,9]`.\n\nReturn the position of `target` in `nums`, or `-1` if it is absent, in **O(log n)** time.",
    "constraints": ["1 <= nums.length <= 5000","-10^4 <= nums[i], target <= 10^4","Values are distinct"],
    "examples": [
      {
        "input": "nums = [12,15,19,3,7,9], target = 7",
        "output": "4",
        "explanation": "7 is at position 4, in the second half."
      },
      {
        "input": "nums = [12,15,19,3,7,9], target = 10",
        "output": "-1",
        "explanation": "10 is not in the list."
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
        "input": [[12,15,19,3,7,9],7],
        "expected": 4
      },
      {
        "input": [[12,15,19,3,7,9],10],
        "expected": -1
      }
    ]
  },
  {
    "id": "time-based-key-value-store",
    "title": "Settings History",
    "slug": "settings-history",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "An app saves every change to its settings, so you can later ask **what a setting was at any moment in the past**.\n\nImplement the `SettingsHistory` class:\n\n- `SettingsHistory()` starts with no saved changes.\n- `set(key, value, timestamp)` records that setting `key` changed to `value` at time `timestamp`.\n- `get(key, timestamp)` returns the value `key` held at time `timestamp`: the value from its **latest change at or before that time**, or `\"\"` if it had not been set yet.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["1 <= key.length, value.length <= 100","Keys and values use lowercase letters and digits","1 <= timestamp <= 10^7","Each key is set with strictly increasing timestamps","At most 2 * 10^5 calls in total"],
    "examples": [
      {
        "input": "operations = [\"SettingsHistory\",\"set\",\"get\",\"get\",\"set\",\"get\"], arguments = [[],[\"theme\",\"dark\",2],[\"theme\",1],[\"theme\",6],[\"theme\",\"light\",7],[\"theme\",8]]",
        "output": "[null,null,\"\",\"dark\",null,\"light\"]",
        "explanation": "\"theme\" was unset at time 1 and \"dark\" at time 6. After it changes to \"light\" at time 7, time 8 sees \"light\"."
      }
    ],
    "functionName": "SettingsHistory",
    "kind": "design",
    "starterCode": {
      "javascript": "class SettingsHistory {\n  constructor() {\n  }\n\n  set(key, value, timestamp) {\n  }\n\n  get(key, timestamp) {\n  }\n}",
      "python": "class SettingsHistory:\n    def __init__(self):\n        pass\n\n    def set(self, key, value, timestamp):\n        pass\n\n    def get(self, key, timestamp):\n        pass",
      "cpp": "class SettingsHistory {\npublic:\n    SettingsHistory() {\n    }\n\n    void set(string key, string value, int timestamp) {\n    }\n\n    string get(string key, int timestamp) {\n    }\n};"
    },
    "sampleTestCases": [
      {
        "input": [["SettingsHistory","set","get","get","set","get"],[[],["theme","dark",2],["theme",1],["theme",6],["theme","light",7],["theme",8]]],
        "expected": [null,null,"","dark",null,"light"]
      }
    ]
  },
  {
    "id": "median-of-two-sorted-arrays",
    "title": "Median of Two Sorted Arrays",
    "slug": "median-of-two-sorted-arrays",
    "difficulty": "Hard",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "Two sorted lists of exam scores, `nums1` and `nums2`, come from two classrooms. Return the **median score across both classrooms together**: the middle score once everything is pooled and sorted, or the mean of the two middle scores if the pooled count is even.\n\nAim for **O(log(m + n))** time, where `m` and `n` are the two lengths.",
    "constraints": ["0 <= m, n <= 1000","1 <= m + n <= 2000","-10^6 <= nums1[i], nums2[i] <= 10^6"],
    "examples": [
      {
        "input": "nums1 = [2,6], nums2 = [4]",
        "output": "4",
        "explanation": "Pooled: [2, 4, 6], so the median is 4."
      },
      {
        "input": "nums1 = [1,7], nums2 = [3,9]",
        "output": "5",
        "explanation": "Pooled: [1, 3, 7, 9], so the median is (3 + 7) / 2 = 5."
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
        "input": [[2,6],[4]],
        "expected": 4
      },
      {
        "input": [[1,7],[3,9]],
        "expected": 5
      }
    ]
  },
  {
    "id": "peak-index-in-a-mountain-array",
    "title": "Peak Index in a Mountain Array",
    "slug": "peak-index-in-a-mountain-array",
    "difficulty": "Medium",
    "category": "Binary Search",
    "companies": [],
    "acceptanceRate": "",
    "description": "A hiking trail's altitude readings `arr` **climb strictly to a single summit and then descend strictly** to the end; the summit is never the first or last reading.\n\nReturn the position of the summit in **O(log n)** time.",
    "constraints": ["3 <= arr.length <= 10^5","0 <= arr[i] <= 10^6","arr always rises then falls as described"],
    "examples": [
      {
        "input": "arr = [1,4,9,6,2]",
        "output": "2",
        "explanation": "The trail tops out at 9, position 2."
      },
      {
        "input": "arr = [3,8,5]",
        "output": "1",
        "explanation": "The summit 8 is at position 1."
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
        "input": [[1,4,9,6,2]],
        "expected": 2
      },
      {
        "input": [[3,8,5]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "**Flip the direction of every link** in a singly linked list, so the last node becomes the first, and return the new first node.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["0 to 5000 nodes","-5000 <= Node.val <= 5000"],
    "examples": [
      {
        "input": "head = [8,3,6]",
        "output": "[6,3,8]",
        "explanation": "8 -> 3 -> 6 turns into 6 -> 3 -> 8."
      },
      {
        "input": "head = []",
        "output": "[]",
        "explanation": "An empty list has nothing to flip."
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
        "input": [[8,3,6]],
        "expected": [6,3,8]
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`list1` and `list2` are linked lists whose values never decrease. **Weave their nodes into a single list that also never decreases**, reusing the existing nodes, and return its first node.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["Each list has 0 to 50 nodes","-100 <= Node.val <= 100","Both lists are in non-decreasing order"],
    "examples": [
      {
        "input": "list1 = [2,5,9], list2 = [3,5]",
        "output": "[2,3,5,5,9]",
        "explanation": "The nodes interleave as 2 -> 3 -> 5 -> 5 -> 9."
      },
      {
        "input": "list1 = [], list2 = [7]",
        "output": "[7]",
        "explanation": "With one list empty, the other is the answer."
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
        "input": [[2,5,9],[3,5]],
        "expected": [2,3,5,5,9]
      },
      {
        "input": [[],[7]],
        "expected": [7]
      }
    ]
  },
  {
    "id": "reorder-list",
    "title": "Reorder List",
    "slug": "reorder-list",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [],
    "acceptanceRate": "",
    "description": "Rearrange a linked list so it **alternates between the front and the back**: first node, last node, second node, second-to-last node, and so on until the two ends meet. Return the first node.\n\nMove the nodes themselves; do not rewrite their values.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["1 to 5 * 10^4 nodes","1 <= Node.val <= 1000"],
    "examples": [
      {
        "input": "head = [10,20,30,40,50,60]",
        "output": "[10,60,20,50,30,40]",
        "explanation": "Front and back alternate: 10, 60, 20, 50, 30, 40."
      },
      {
        "input": "head = [7,8,9]",
        "output": "[7,9,8]",
        "explanation": "With three nodes the middle one ends up last."
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
        "input": [[10,20,30,40,50,60]],
        "expected": [10,60,20,50,30,40]
      },
      {
        "input": [[7,8,9]],
        "expected": [7,9,8]
      }
    ]
  },
  {
    "id": "remove-nth-node-from-end-of-list",
    "title": "Remove Nth Node From End of List",
    "slug": "remove-nth-node-from-end-of-list",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [],
    "acceptanceRate": "",
    "description": "Counting backwards from the tail (the tail is number 1), **unlink node number `n`** from the list and return the list's first node.\n\nTry to do it in a single pass.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["The list has sz nodes, 1 <= sz <= 30","0 <= Node.val <= 100","1 <= n <= sz"],
    "examples": [
      {
        "input": "head = [6,7,8,9], n = 3",
        "output": "[6,8,9]",
        "explanation": "Third from the tail is 7."
      },
      {
        "input": "head = [5,1], n = 1",
        "output": "[5]",
        "explanation": "n = 1 removes the tail."
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
        "input": [[6,7,8,9],3],
        "expected": [6,8,9]
      },
      {
        "input": [[5,1],1],
        "expected": [5]
      }
    ]
  },
  {
    "id": "add-two-numbers",
    "title": "Add Digit Lists",
    "slug": "add-digit-lists",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [],
    "acceptanceRate": "",
    "description": "Big numbers are stored as linked lists of single digits, **ones digit first**: `3 -> 1 -> 5` stands for 513. Given two such numbers `l1` and `l2`, return their **sum** in the same format.\n\nNeither input has extra zeros at its high end (except the number 0, which is a single `0` node).\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["Each list has 1 to 100 nodes","0 <= Node.val <= 9","No extra zeros at the high end"],
    "examples": [
      {
        "input": "l1 = [3,1,5], l2 = [8,2]",
        "output": "[1,4,5]",
        "explanation": "513 + 28 = 541, stored as 1 -> 4 -> 5."
      },
      {
        "input": "l1 = [9,9], l2 = [1]",
        "output": "[0,0,1]",
        "explanation": "99 + 1 = 100: the carry adds a new digit."
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
        "input": [[3,1,5],[8,2]],
        "expected": [1,4,5]
      },
      {
        "input": [[9,9],[1]],
        "expected": [0,0,1]
      }
    ]
  },
  {
    "id": "linked-list-cycle",
    "title": "Linked List Cycle",
    "slug": "linked-list-cycle",
    "difficulty": "Easy",
    "category": "Linked List",
    "companies": [],
    "acceptanceRate": "",
    "description": "Return `true` if following `next` pointers from `head` **eventually loops back to a node you already visited**, and `false` if it reaches the end.\n\nTo build the test, the judge takes the values in `head` and, if `pos` is not `-1`, points the last node back at the node in position `pos`. Your function sees only the head node, not `pos`. Can you do it with O(1) extra memory?\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["0 to 10^4 nodes","-10^5 <= Node.val <= 10^5","pos is -1 or a valid position in the list"],
    "examples": [
      {
        "input": "head = [4,8,15,16], pos = 2",
        "output": "true",
        "explanation": "The last node points back at 15, so walking never ends."
      },
      {
        "input": "head = [6,1,9], pos = -1",
        "output": "false",
        "explanation": "The last node points nowhere."
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
        "input": [[4,8,15,16],2],
        "expected": true
      },
      {
        "input": [[6,1,9],-1],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` has `n + 1` entries, each between `1` and `n`, so some value must repeat. **Exactly one value repeats** (possibly more than twice). Return it.\n\nFor the full challenge, leave `nums` unchanged and use only O(1) extra memory.",
    "constraints": ["1 <= n <= 10^5","nums.length == n + 1","1 <= nums[i] <= n","One value appears two or more times; no other value repeats"],
    "examples": [
      {
        "input": "nums = [2,5,1,3,4,5]",
        "output": "5",
        "explanation": "Six entries, values 1 to 5: the 5 shows up twice."
      },
      {
        "input": "nums = [4,2,1,4,3,4]",
        "output": "4",
        "explanation": "4 shows up three times."
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
        "input": [[2,5,1,3,4,5]],
        "expected": 5
      },
      {
        "input": [[4,2,1,4,3,4]],
        "expected": 4
      }
    ]
  },
  {
    "id": "lru-cache",
    "title": "LRU Cache",
    "slug": "lru-cache",
    "difficulty": "Medium",
    "category": "Linked List",
    "companies": [],
    "acceptanceRate": "",
    "description": "Build a fixed-size cache that, when full, **throws out the entry that has gone unused the longest** (an LRU cache).\n\nImplement the `LRUCache` class:\n\n- `LRUCache(capacity)` makes an empty cache with room for `capacity` entries.\n- `get(key)` returns the stored value for `key`, or `-1` if it is not cached. Reading a key counts as using it.\n- `put(key, value)` stores or overwrites `key`, which also counts as using it. If this adds a new key to a full cache, first drop the least recently used key.\n\nMake both operations **O(1)** on average.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["1 <= capacity <= 3000","0 <= key <= 10^4","0 <= value <= 10^5","At most 2 * 10^5 calls in total"],
    "examples": [
      {
        "input": "operations = [\"LRUCache\",\"put\",\"put\",\"get\",\"put\",\"get\",\"get\",\"put\",\"put\",\"get\",\"get\"], arguments = [[2],[5,50],[6,60],[6],[7,70],[5],[7],[6,61],[8,80],[7],[6]]",
        "output": "[null,null,null,60,null,-1,70,null,null,-1,61]",
        "explanation": "Reading 6 leaves 5 as the stalest key, so adding 7 drops 5. Rewriting 6 then makes 7 the stalest, so adding 8 drops 7."
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
        "input": [["LRUCache","put","put","get","put","get","get","put","put","get","get"],[[2],[5,50],[6,60],[6],[7,70],[5],[7],[6,61],[8,80],[7],[6]]],
        "expected": [null,null,null,60,null,-1,70,null,null,-1,61]
      }
    ]
  },
  {
    "id": "merge-k-sorted-lists",
    "title": "Merge k Sorted Lists",
    "slug": "merge-k-sorted-lists",
    "difficulty": "Hard",
    "category": "Linked List",
    "companies": [],
    "acceptanceRate": "",
    "description": "`lists` holds `k` linked lists, each already in increasing order. **Combine all of their nodes into one list in increasing order** and return its first node.\n\nIn the tests each list is written as an array of values; your function receives an array of first nodes, with `null` for an empty list.\n\nThe linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.",
    "constraints": ["k == lists.length","0 <= k <= 10^4","0 <= lists[i].length <= 500","-10^4 <= lists[i][j] <= 10^4","Each list is in increasing order","At most 10^4 nodes in total"],
    "examples": [
      {
        "input": "lists = [[3,8],[1,9,10],[4]]",
        "output": "[1,3,4,8,9,10]",
        "explanation": "All six values end up in one sorted chain."
      },
      {
        "input": "lists = [[],[2,2]]",
        "output": "[2,2]",
        "explanation": "An empty list contributes nothing."
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
        "input": [[[3,8],[1,9,10],[4]]],
        "expected": [1,3,4,8,9,10]
      },
      {
        "input": [[[],[2,2]]],
        "expected": [2,2]
      }
    ]
  },
  {
    "id": "invert-binary-tree",
    "title": "Invert Binary Tree",
    "slug": "invert-binary-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "Turn a binary tree into its **mirror image**: at every node, the left child and the right child trade places. Return the root.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["0 to 100 nodes","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [5,3,8,1,4]",
        "output": "[5,8,3,null,null,4,1]",
        "explanation": "8 moves to the left of 5, and below 3 the children 1 and 4 trade places."
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "An empty tree is its own mirror."
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
        "input": [[5,3,8,1,4]],
        "expected": [5,8,3,null,null,4,1]
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
    "companies": [],
    "acceptanceRate": "",
    "description": "How many levels does a binary tree have? Return the **number of nodes on the longest downward path** from the root to any leaf (an empty tree has depth 0).\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["0 to 10^4 nodes","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [8,4,null,2,null,7]",
        "output": "4",
        "explanation": "The path 8 -> 4 -> 2 -> 7 has four nodes."
      },
      {
        "input": "root = [5,1,9]",
        "output": "2",
        "explanation": "Root plus one level of children."
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
        "input": [[8,4,null,2,null,7]],
        "expected": 4
      },
      {
        "input": [[5,1,9]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Treat a binary tree as a network of cables, one per parent-child link. Return the **most cables you would pass through travelling between any two nodes** without backtracking. The route does not have to go through the root.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["1 to 10^4 nodes","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [1,2,3,null,4,null,null,5,6]",
        "output": "4",
        "explanation": "5 -> 4 -> 2 -> 1 -> 3 crosses four links."
      },
      {
        "input": "root = [7,null,3]",
        "output": "1",
        "explanation": "Two nodes, one link."
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
        "input": [[1,2,3,null,4,null,null,5,6]],
        "expected": 4
      },
      {
        "input": [[7,null,3]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Return `true` if, **at every node** of the binary tree, the depths of the left branch and the right branch **differ by no more than 1**. Otherwise return `false`.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["0 to 5000 nodes","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [4,2,6,1]",
        "output": "true",
        "explanation": "The deepest gap anywhere is one level."
      },
      {
        "input": "root = [4,2,null,1]",
        "output": "false",
        "explanation": "At the root the left branch is two levels deep and the right branch is empty."
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
        "input": [[4,2,6,1]],
        "expected": true
      },
      {
        "input": [[4,2,null,1]],
        "expected": false
      }
    ]
  },
  {
    "id": "same-tree",
    "title": "Same Tree",
    "slug": "same-tree",
    "difficulty": "Easy",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "Return `true` if the binary trees `p` and `q` are **exact copies**: the same shape, with equal values in matching positions. Otherwise return `false`.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["Each tree has 0 to 100 nodes","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "p = [4,7,1], q = [4,7,1]",
        "output": "true",
        "explanation": "Same shape, same values."
      },
      {
        "input": "p = [4,7,1], q = [4,1,7]",
        "output": "false",
        "explanation": "Same shape, but 7 and 1 sit on opposite sides."
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
        "input": [[4,7,1],[4,7,1]],
        "expected": true
      },
      {
        "input": [[4,7,1],[4,1,7]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Pick any node of `root` and take it **together with everything below it**. Return `true` if some such piece is an exact copy of the tree `subRoot` (same shape, same values), otherwise `false`.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["root has 1 to 2000 nodes","subRoot has 1 to 1000 nodes","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [8,5,9,2,6], subRoot = [5,2,6]",
        "output": "true",
        "explanation": "The piece hanging from 5 is exactly 5 -> (2, 6)."
      },
      {
        "input": "root = [8,5,9,2,6,null,null,1], subRoot = [5,2,6]",
        "output": "false",
        "explanation": "Below 5 the 2 now has a child 1, so it no longer matches."
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
        "input": [[8,5,9,2,6],[5,2,6]],
        "expected": true
      },
      {
        "input": [[8,5,9,2,6,null,null,1],[5,2,6]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`root` is a **binary search tree** (smaller values to the left, larger to the right) that contains the values `p` and `q`. Return the value of the **deepest node that has both `p` and `q` beneath it**, counting a node as being beneath itself.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["2 to 10^5 nodes","-10^9 <= Node.val <= 10^9","Values are distinct","p != q, and both are in the tree"],
    "examples": [
      {
        "input": "root = [10,5,15,2,7,12,20,null,null,6,8], p = 2, q = 20",
        "output": "10",
        "explanation": "2 lies left of 10 and 20 lies right of it, so they split at 10."
      },
      {
        "input": "root = [10,5,15,2,7,12,20,null,null,6,8], p = 5, q = 8",
        "output": "5",
        "explanation": "8 is beneath 5, and 5 counts as beneath itself."
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
        "input": [[10,5,15,2,7,12,20,null,null,6,8],2,20],
        "expected": 10
      },
      {
        "input": [[10,5,15,2,7,12,20,null,null,6,8],5,8],
        "expected": 5
      }
    ]
  },
  {
    "id": "binary-tree-level-order-traversal",
    "title": "Binary Tree Level Order Traversal",
    "slug": "binary-tree-level-order-traversal",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "Group the values of a binary tree **by depth**: one array for the root's level, one for its children, one for its grandchildren, and so on. Within a level, list values from left to right.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["0 to 2000 nodes","-1000 <= Node.val <= 1000"],
    "examples": [
      {
        "input": "root = [8,4,11,null,5,9]",
        "output": "[[8],[4,11],[5,9]]",
        "explanation": "Depth 0 holds 8, depth 1 holds 4 and 11, depth 2 holds 5 and 9."
      },
      {
        "input": "root = [6]",
        "output": "[[6]]",
        "explanation": "One node, one level."
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
        "input": [[8,4,11,null,5,9]],
        "expected": [[8],[4,11],[5,9]]
      },
      {
        "input": [[6]],
        "expected": [[6]]
      }
    ]
  },
  {
    "id": "binary-tree-right-side-view",
    "title": "Binary Tree Right Side View",
    "slug": "binary-tree-right-side-view",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "For each level of a binary tree, take the **rightmost node on that level**. Return those values from the top level down.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["0 to 100 nodes","-100 <= Node.val <= 100"],
    "examples": [
      {
        "input": "root = [6,3,9,2]",
        "output": "[6,9,2]",
        "explanation": "The rightmost nodes are 6, then 9, then 2."
      },
      {
        "input": "root = [1,2,null,3]",
        "output": "[1,2,3]",
        "explanation": "Each level has a single node, even though they lean left."
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
        "input": [[6,3,9,2]],
        "expected": [6,9,2]
      },
      {
        "input": [[1,2,null,3]],
        "expected": [1,2,3]
      }
    ]
  },
  {
    "id": "count-good-nodes-in-binary-tree",
    "title": "Nodes Without a Bigger Ancestor",
    "slug": "nodes-without-a-bigger-ancestor",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "Walk down a binary tree from the root. Count the nodes whose value is **at least as large as every value above them** on their path from the root. The root always counts.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["1 to 10^5 nodes","-10^4 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [5,3,8,6,null,7,9]",
        "output": "4",
        "explanation": "5, 6, 8 and 9 qualify; 3 sits below 5 and 7 sits below 8."
      },
      {
        "input": "root = [2,2,1]",
        "output": "2",
        "explanation": "A tie with an ancestor still counts, so both 2s qualify."
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
        "input": [[5,3,8,6,null,7,9]],
        "expected": 4
      },
      {
        "input": [[2,2,1]],
        "expected": 2
      }
    ]
  },
  {
    "id": "validate-binary-search-tree",
    "title": "Validate Binary Search Tree",
    "slug": "validate-binary-search-tree",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "Check whether a binary tree is a **binary search tree**: for every node, **everything** in its left branch must be strictly smaller than it and **everything** in its right branch strictly larger. Return `true` or `false`.\n\nComparing a node only with its direct children is not enough.\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["1 to 10^4 nodes","-2^31 <= Node.val <= 2^31 - 1"],
    "examples": [
      {
        "input": "root = [8,3,10]",
        "output": "true",
        "explanation": "3 < 8 < 10."
      },
      {
        "input": "root = [8,3,10,null,null,6,12]",
        "output": "false",
        "explanation": "6 is in the right branch of 8 but smaller than 8."
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
        "input": [[8,3,10]],
        "expected": true
      },
      {
        "input": [[8,3,10,null,null,6,12]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`root` is a binary search tree. If you listed all its values from smallest to largest, **which value would be in position `k`** (counting from 1)?\n\nThe binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.",
    "constraints": ["n nodes, with 1 <= k <= n <= 10^4","0 <= Node.val <= 10^4"],
    "examples": [
      {
        "input": "root = [6,2,8,null,4], k = 2",
        "output": "4",
        "explanation": "Sorted: 2, 4, 6, 8. Position 2 holds 4."
      },
      {
        "input": "root = [7,4,9,3,5], k = 4",
        "output": "7",
        "explanation": "Sorted: 3, 4, 5, 7, 9. Position 4 holds 7."
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
        "input": [[6,2,8,null,4],2],
        "expected": 4
      },
      {
        "input": [[7,4,9,3,5],4],
        "expected": 7
      }
    ]
  },
  {
    "id": "number-of-islands",
    "title": "Number of Islands",
    "slug": "number-of-islands",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "A satellite map `grid` marks land as `\"1\"` and water as `\"0\"`. Land cells that touch **side by side (not diagonally)** belong to the same island, and everything outside the map is water.\n\nCount the **islands** on the map.",
    "constraints": ["m == grid.length, n == grid[i].length","1 <= m, n <= 300","Every cell is \"0\" or \"1\""],
    "examples": [
      {
        "input": "grid = [[\"1\",\"0\",\"1\"],[\"1\",\"0\",\"0\"],[\"0\",\"1\",\"1\"]]",
        "output": "3",
        "explanation": "The left column pair, the top-right cell and the bottom-right pair are separate."
      },
      {
        "input": "grid = [[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"1\"],[\"0\",\"0\",\"1\"]]",
        "output": "1",
        "explanation": "The land snakes from the top-left to the bottom-right without a break."
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
        "input": [[["1","0","1"],["1","0","0"],["0","1","1"]]],
        "expected": 3
      },
      {
        "input": [[["1","1","0"],["0","1","1"],["0","0","1"]]],
        "expected": 1
      }
    ]
  },
  {
    "id": "max-area-of-island",
    "title": "Max Area of Island",
    "slug": "max-area-of-island",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "In the map `grid`, `1` is land and `0` is water. Land cells that share a side form one island, and an island's size is how many cells it covers.\n\nReturn the **size of the biggest island**, or `0` if the map has no land.",
    "constraints": ["m == grid.length, n == grid[i].length","1 <= m, n <= 50","Every cell is 0 or 1"],
    "examples": [
      {
        "input": "grid = [[1,1,0,0],[0,1,0,1],[1,0,1,1],[0,0,0,1]]",
        "output": "4",
        "explanation": "The island on the right covers four cells; the top-left one covers three."
      },
      {
        "input": "grid = [[0,0],[0,0]]",
        "output": "0",
        "explanation": "All water."
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
        "input": [[[1,1,0,0],[0,1,0,1],[1,0,1,1],[0,0,0,1]]],
        "expected": 4
      },
      {
        "input": [[[0,0],[0,0]]],
        "expected": 0
      }
    ]
  },
  {
    "id": "pacific-atlantic-water-flow",
    "title": "Rainfall to Both Seas",
    "slug": "rainfall-to-both-seas",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "`heights` is an elevation map of a rectangular valley. The **North Sea** lies along the top and left edges, and the **South Sea** along the bottom and right edges.\n\nRain on a cell can run to a side neighbour that is **no higher** than the cell itself, and drains into a sea from any cell on that sea's edges.\n\nReturn every cell `[row, col]` whose rain can end up in **both** seas, in any order.",
    "constraints": ["m == heights.length, n == heights[r].length","1 <= m, n <= 200","0 <= heights[r][c] <= 10^5"],
    "examples": [
      {
        "input": "heights = [[3,2,1],[4,5,2],[6,3,1]]",
        "output": "[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0]]",
        "explanation": "Only the two bottom-right cells are cut off from the North Sea."
      },
      {
        "input": "heights = [[2,1]]",
        "output": "[[0,0],[0,1]]",
        "explanation": "Both cells sit on edges of both seas."
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
        "input": [[[3,2,1],[4,5,2],[6,3,1]]],
        "expected": [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0]]
      },
      {
        "input": [[[2,1]]],
        "expected": [[0,0],[0,1]]
      }
    ]
  },
  {
    "id": "surrounded-regions",
    "title": "Surrounded Regions",
    "slug": "surrounded-regions",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "On the board, `\"O\"` cells that share a side form a group. A group that **cannot reach the edge of the board** through other `\"O\"` cells is enclosed, and every cell in it turns into `\"X\"`. Groups with at least one cell on the edge are untouched.\n\nReturn the board after all enclosed groups have been filled in.",
    "constraints": ["m == board.length, n == board[i].length","1 <= m, n <= 200","Every cell is \"X\" or \"O\""],
    "examples": [
      {
        "input": "board = [[\"X\",\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\",\"O\",\"X\"],[\"X\",\"O\",\"X\",\"X\",\"O\"],[\"X\",\"X\",\"X\",\"X\",\"X\"]]",
        "output": "[[\"X\",\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\",\"O\"],[\"X\",\"X\",\"X\",\"X\",\"X\"]]",
        "explanation": "The two inner groups are enclosed and fill in; the O on the right edge survives."
      },
      {
        "input": "board = [[\"O\",\"X\"]]",
        "output": "[[\"O\",\"X\"]]",
        "explanation": "Both cells are on the edge, so nothing changes."
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
        "input": [[["X","X","X","X","X"],["X","O","X","O","X"],["X","O","X","X","O"],["X","X","X","X","X"]]],
        "expected": [["X","X","X","X","X"],["X","X","X","X","X"],["X","X","X","X","O"],["X","X","X","X","X"]]
      },
      {
        "input": [[["O","X"]]],
        "expected": [["O","X"]]
      }
    ]
  },
  {
    "id": "rotting-oranges",
    "title": "Mold on the Bread Shelf",
    "slug": "mold-on-the-bread-shelf",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "A bakery shelf is a grid where `0` is an empty spot, `1` is a fresh loaf and `2` is a moldy loaf. Each hour, mold spreads from every moldy loaf to the fresh loaves directly **above, below, left or right** of it.\n\nReturn how many **hours pass before no fresh loaf is left**, or `-1` if some loaf can never be reached.",
    "constraints": ["m == grid.length, n == grid[i].length","1 <= m, n <= 10","Every cell is 0, 1 or 2"],
    "examples": [
      {
        "input": "grid = [[1,1,2],[0,1,1],[1,1,0]]",
        "output": "4",
        "explanation": "Mold starts top-right and reaches the last loaf, bottom-left, in hour 4."
      },
      {
        "input": "grid = [[2,0,1]]",
        "output": "-1",
        "explanation": "The empty spot shields the fresh loaf forever."
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
        "input": [[[1,1,2],[0,1,1],[1,1,0]]],
        "expected": 4
      },
      {
        "input": [[[2,0,1]]],
        "expected": -1
      }
    ]
  },
  {
    "id": "course-schedule",
    "title": "Course Schedule",
    "slug": "course-schedule",
    "difficulty": "Medium",
    "category": "Trees & Graphs",
    "companies": [],
    "acceptanceRate": "",
    "description": "A degree has courses numbered `0` to `numCourses - 1`. Each pair `[a, b]` in `prerequisites` says course `b` **must be completed before** course `a` can start.\n\nReturn `true` if a student can complete every course, or `false` if the requirements make that impossible.",
    "constraints": ["1 <= numCourses <= 2000","0 <= prerequisites.length <= 5000","Each pair has two course numbers","0 <= a, b < numCourses","No pair is repeated"],
    "examples": [
      {
        "input": "numCourses = 3, prerequisites = [[2,0],[1,2]]",
        "output": "true",
        "explanation": "Course 0, then 2, then 1."
      },
      {
        "input": "numCourses = 3, prerequisites = [[0,1],[1,2],[2,0]]",
        "output": "false",
        "explanation": "The three requirements form a loop, so none can start."
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
        "input": [3,[[2,0],[1,2]]],
        "expected": true
      },
      {
        "input": [3,[[0,1],[1,2],[2,0]]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Courses are numbered `0` to `numCourses - 1`, and each pair `[a, b]` in `prerequisites` means course `b` comes **before** course `a`. Plan a timetable that takes **every course exactly once** and respects all the requirements. Return `[]` if no such timetable exists.\n\nTo keep the answer unique: whenever several courses are available, take the **lowest-numbered** one next.",
    "constraints": ["1 <= numCourses <= 2000","0 <= prerequisites.length <= numCourses * (numCourses - 1)","Each pair has two course numbers","0 <= a, b < numCourses","a != b, and no pair is repeated"],
    "examples": [
      {
        "input": "numCourses = 3, prerequisites = [[2,0],[1,2]]",
        "output": "[0,2,1]",
        "explanation": "0 has no requirement, 2 needs 0, and 1 needs 2."
      },
      {
        "input": "numCourses = 4, prerequisites = [[2,1],[3,1],[0,3]]",
        "output": "[1,2,3,0]",
        "explanation": "Only 1 is free at first; it unlocks 2 and 3 (2 goes first), and 3 unlocks 0."
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
        "input": [3,[[2,0],[1,2]]],
        "expected": [0,2,1]
      },
      {
        "input": [4,[[2,1],[3,1],[0,3]]],
        "expected": [1,2,3,0]
      }
    ]
  },
  {
    "id": "climbing-stairs",
    "title": "Climbing Stairs",
    "slug": "climbing-stairs",
    "difficulty": "Easy",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "A staircase has `n` steps, and with each stride you go up **either 1 step or 2 steps**.\n\nCount the different sequences of strides that take you from the bottom exactly to the top step.",
    "constraints": ["1 <= n <= 45"],
    "examples": [
      {
        "input": "n = 4",
        "output": "5",
        "explanation": "Five sequences: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1 and 2+2."
      },
      {
        "input": "n = 5",
        "output": "8",
        "explanation": "Eight sequences reach step 5."
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
        "input": [4],
        "expected": 5
      },
      {
        "input": [5],
        "expected": 8
      }
    ]
  },
  {
    "id": "min-cost-climbing-stairs",
    "title": "Cheapest Way Up the Stairs",
    "slug": "cheapest-way-up-the-stairs",
    "difficulty": "Easy",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "Each step of a staircase has a toll: `cost[i]` is paid when you **leave step `i`**, and from there you may move up **one or two** steps.\n\nYou can begin on step `0` or step `1` for free. Return the **least total toll** to get past the last step.",
    "constraints": ["2 <= cost.length <= 1000","0 <= cost[i] <= 999"],
    "examples": [
      {
        "input": "cost = [4,9,3]",
        "output": "7",
        "explanation": "Start on step 0 (pay 4, jump two), then pay 3 and step off the top: 7."
      },
      {
        "input": "cost = [2,6,1,8,1]",
        "output": "4",
        "explanation": "Start on step 0 (pay 2), then hop over to steps 2 and 4 paying 1 each: 4."
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
        "input": [[4,9,3]],
        "expected": 7
      },
      {
        "input": [[2,6,1,8,1]],
        "expected": 4
      }
    ]
  },
  {
    "id": "house-robber",
    "title": "Booking Festival Booths",
    "slug": "booking-festival-booths",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "A festival rents out booths in a single row, and booth `i` would earn you `nums[i]`. Noise rules forbid you from renting **two booths that are next to each other**.\n\nReturn the **most you can earn** with the booths you choose.",
    "constraints": ["1 <= nums.length <= 100","0 <= nums[i] <= 400"],
    "examples": [
      {
        "input": "nums = [3,8,4]",
        "output": "8",
        "explanation": "The middle booth alone (8) beats the two ends together (3 + 4)."
      },
      {
        "input": "nums = [6,1,2,7]",
        "output": "13",
        "explanation": "Booths 0 and 3 are not neighbours: 6 + 7 = 13."
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
        "input": [[3,8,4]],
        "expected": 8
      },
      {
        "input": [[6,1,2,7]],
        "expected": 13
      }
    ]
  },
  {
    "id": "house-robber-ii",
    "title": "Booking Festival Booths II",
    "slug": "booking-festival-booths-ii",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "This time the booths stand in a **ring** around a fountain, so the first and last booths are also neighbours. Booth `i` earns `nums[i]`, and you still may not rent two neighbouring booths.\n\nReturn the **most you can earn**.",
    "constraints": ["1 <= nums.length <= 100","0 <= nums[i] <= 1000"],
    "examples": [
      {
        "input": "nums = [4,1,4]",
        "output": "4",
        "explanation": "In a ring of three every pair is adjacent, so only one booth: 4."
      },
      {
        "input": "nums = [2,5,1,6]",
        "output": "11",
        "explanation": "Booths 1 and 3 are not neighbours: 5 + 6 = 11."
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
        "input": [[4,1,4]],
        "expected": 4
      },
      {
        "input": [[2,5,1,6]],
        "expected": 11
      }
    ]
  },
  {
    "id": "longest-palindromic-substring",
    "title": "Longest Palindromic Substring",
    "slug": "longest-palindromic-substring",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "Find the **longest unbroken stretch of `s` that reads the same backwards** and return it.\n\nIf there is a tie for the longest, return the one that begins earliest.",
    "constraints": ["1 <= s.length <= 1000","s contains only English letters and digits"],
    "examples": [
      {
        "input": "s = \"xabay\"",
        "output": "\"aba\"",
        "explanation": "\"aba\" is the only palindrome longer than one character."
      },
      {
        "input": "s = \"ppqq\"",
        "output": "\"pp\"",
        "explanation": "\"pp\" and \"qq\" tie; \"pp\" comes first."
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
        "input": ["xabay"],
        "expected": "aba"
      },
      {
        "input": ["ppqq"],
        "expected": "pp"
      }
    ]
  },
  {
    "id": "palindromic-substrings",
    "title": "Palindromic Substrings",
    "slug": "palindromic-substrings",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "Count the **stretches of `s` that read the same backwards**. Every start and end position counts separately, so identical text at two different places is counted twice.",
    "constraints": ["1 <= s.length <= 1000","s uses only lowercase English letters"],
    "examples": [
      {
        "input": "s = \"xyz\"",
        "output": "3",
        "explanation": "Only the three single letters."
      },
      {
        "input": "s = \"aba\"",
        "output": "4",
        "explanation": "\"a\", \"b\", \"a\" and \"aba\"."
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
        "input": ["xyz"],
        "expected": 3
      },
      {
        "input": ["aba"],
        "expected": 4
      }
    ]
  },
  {
    "id": "decode-ways",
    "title": "Decode Ways",
    "slug": "decode-ways",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "A secret message was written with `A = 1`, `B = 2`, ..., `Z = 26`, and the numbers were then run together, so the spaces are lost. Given the digit string `s`, count **how many letter messages could have produced it**.\n\nEvery chunk must be a number from `1` to `26` with no leading zero: `\"0\"` and `\"05\"` are not letters. The count fits in a 32-bit integer.",
    "constraints": ["1 <= s.length <= 100","s contains only digits, possibly starting with 0"],
    "examples": [
      {
        "input": "s = \"17\"",
        "output": "2",
        "explanation": "\"17\" is either \"AG\" (1, 7) or \"Q\" (17)."
      },
      {
        "input": "s = \"1201\"",
        "output": "1",
        "explanation": "The 0 must pair with the 2 as 20, leaving 1, 20, 1 = \"ATA\"."
      },
      {
        "input": "s = \"30\"",
        "output": "0",
        "explanation": "\"30\" and a lone \"0\" are not letters."
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
        "input": ["17"],
        "expected": 2
      },
      {
        "input": ["1201"],
        "expected": 1
      },
      {
        "input": ["30"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "A vending machine must return exactly `amount` in change, and it has an endless supply of coins with the values in `coins`. Return the **smallest number of coins** that adds up to `amount`, or `-1` if no combination works.",
    "constraints": ["1 <= coins.length <= 12","1 <= coins[i] <= 2^31 - 1","0 <= amount <= 10^4"],
    "examples": [
      {
        "input": "coins = [3,7], amount = 13",
        "output": "3",
        "explanation": "7 + 3 + 3 = 13 uses three coins."
      },
      {
        "input": "coins = [4], amount = 6",
        "output": "-1",
        "explanation": "Coins of 4 can only make multiples of 4."
      },
      {
        "input": "coins = [2], amount = 0",
        "output": "0",
        "explanation": "No change needed, no coins."
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
        "input": [[3,7],13],
        "expected": 3
      },
      {
        "input": [[4],6],
        "expected": -1
      },
      {
        "input": [[2],0],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Choose **one unbroken, non-empty run of numbers** in `nums` and multiply them together. Return the **largest product** any such run can give.\n\nThe answer fits in a 32-bit integer.",
    "constraints": ["1 <= nums.length <= 2 * 10^4","-10 <= nums[i] <= 10","Every prefix and suffix product fits in a 32-bit integer"],
    "examples": [
      {
        "input": "nums = [3,-1,4,2]",
        "output": "8",
        "explanation": "4 x 2 = 8; including the -1 would make it negative."
      },
      {
        "input": "nums = [-3,0,-2]",
        "output": "0",
        "explanation": "The two negatives are separated by 0, so 0 is the best."
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
        "input": [[3,-1,4,2]],
        "expected": 8
      },
      {
        "input": [[-3,0,-2]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Can the text `s` be **chopped into pieces that are all words from `wordDict`**, with nothing left over? Words may be used any number of times. Return `true` or `false`.",
    "constraints": ["1 <= s.length <= 300","1 <= wordDict.length <= 1000","1 <= wordDict[i].length <= 20","All strings use only lowercase English letters","Dictionary words are distinct"],
    "examples": [
      {
        "input": "s = \"sunflower\", wordDict = [\"sun\",\"flow\",\"flower\",\"er\"]",
        "output": "true",
        "explanation": "\"sun\" + \"flower\"."
      },
      {
        "input": "s = \"nightmare\", wordDict = [\"night\",\"mare\",\"ma\"]",
        "output": "true",
        "explanation": "\"night\" + \"mare\"; \"ma\" alone would leave \"re\"."
      },
      {
        "input": "s = \"pineapples\", wordDict = [\"pine\",\"apple\",\"pen\"]",
        "output": "false",
        "explanation": "\"pine\" + \"apple\" leaves an \"s\" that is not a word."
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
        "input": ["sunflower",["sun","flow","flower","er"]],
        "expected": true
      },
      {
        "input": ["nightmare",["night","mare","ma"]],
        "expected": true
      },
      {
        "input": ["pineapples",["pine","apple","pen"]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Cross out as few numbers of `nums` as you like (keeping the rest in order) so that what remains is **strictly increasing**. Return the **most numbers you can keep**.",
    "constraints": ["1 <= nums.length <= 2500","-10^4 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "nums = [5,1,6,2,7,3,8]",
        "output": "4",
        "explanation": "Keep 5, 6, 7, 8 (or 1, 2, 3, 8)."
      },
      {
        "input": "nums = [9,9,9]",
        "output": "1",
        "explanation": "Equal values never count as increasing."
      },
      {
        "input": "nums = [2,8,3,4,1]",
        "output": "3",
        "explanation": "Keep 2, 3, 4."
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
        "input": [[5,1,6,2,7,3,8]],
        "expected": 4
      },
      {
        "input": [[9,9,9]],
        "expected": 1
      },
      {
        "input": [[2,8,3,4,1]],
        "expected": 3
      }
    ]
  },
  {
    "id": "unique-paths",
    "title": "Unique Paths",
    "slug": "unique-paths",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "A city is a grid of `m` rows by `n` columns of blocks. A courier starts at the top-left block and must reach the bottom-right block, moving only **down or right** one block at a time.\n\nCount the **different routes** the courier can take.",
    "constraints": ["1 <= m, n <= 100","The answer is at most 2 * 10^9"],
    "examples": [
      {
        "input": "m = 4, n = 5",
        "output": "35",
        "explanation": "Any route is 3 downs and 4 rights in some order: 35 routes."
      },
      {
        "input": "m = 2, n = 3",
        "output": "3",
        "explanation": "One down and two rights: right-right-down, right-down-right or down-right-right."
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
        "input": [4,5],
        "expected": 35
      },
      {
        "input": [2,3],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "You stand on the first square of a row. The number on square `i`, `nums[i]`, is **the farthest you may jump forward from it** (any shorter jump is allowed too).\n\nReturn `true` if you can land on the last square, otherwise `false`.",
    "constraints": ["1 <= nums.length <= 10^4","0 <= nums[i] <= 10^5"],
    "examples": [
      {
        "input": "nums = [1,2,0,1]",
        "output": "true",
        "explanation": "Jump to square 1, and from there two squares to the end."
      },
      {
        "input": "nums = [2,1,0,3]",
        "output": "false",
        "explanation": "Every route gets stuck on the 0 at square 2."
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
        "input": [[1,2,0,1]],
        "expected": true
      },
      {
        "input": [[2,1,0,3]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "As before, square `i` lets you jump forward **up to `nums[i]` squares**. The last square can always be reached.\n\nReturn the **fewest jumps** needed to get from the first square to the last.",
    "constraints": ["1 <= nums.length <= 10^4","0 <= nums[i] <= 1000","The last square is always reachable"],
    "examples": [
      {
        "input": "nums = [1,4,1,1,1]",
        "output": "2",
        "explanation": "Hop to square 1, then the 4 carries you to the end."
      },
      {
        "input": "nums = [3,1,1,1]",
        "output": "1",
        "explanation": "One jump of three reaches the end."
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
        "input": [[1,4,1,1,1]],
        "expected": 2
      },
      {
        "input": [[3,1,1,1]],
        "expected": 1
      }
    ]
  },
  {
    "id": "gas-station",
    "title": "Fuel Stops on a Ring Road",
    "slug": "fuel-stops-on-a-ring-road",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "A ring road has `n` fuel stops. At stop `i` you can take on `gas[i]` litres, and the drive from stop `i` to stop `i + 1` (wrapping around after the last) burns `cost[i]` litres. Your tank starts empty and never overflows.\n\nReturn the stop to **start from so you can drive one full lap**, or `-1` if no start works. When an answer exists, it is the only one.",
    "constraints": ["n == gas.length == cost.length","1 <= n <= 10^5","0 <= gas[i], cost[i] <= 10^4","At most one start works"],
    "examples": [
      {
        "input": "gas = [2,5,1,4], cost = [3,2,4,1]",
        "output": "1",
        "explanation": "From stop 1 the tank reads 3, 0, 3 and 2 after each leg, never below zero."
      },
      {
        "input": "gas = [1,2,3], cost = [2,2,3]",
        "output": "-1",
        "explanation": "The road burns 7 litres but only 6 are available."
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
        "input": [[2,5,1,4],[3,2,4,1]],
        "expected": 1
      },
      {
        "input": [[1,2,3],[2,2,3]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`intervals` is a list of **non-overlapping** `[start, end]` bookings, ordered by start. Add the booking `newInterval`, **joining it with any bookings it overlaps** so the list stays ordered and free of overlaps, and return the new list.",
    "constraints": ["0 <= intervals.length <= 10^4","Each interval has two numbers","0 <= start <= end <= 10^5","intervals is ordered by start","newInterval has two numbers"],
    "examples": [
      {
        "input": "intervals = [[2,4],[7,9],[12,14]], newInterval = [8,13]",
        "output": "[[2,4],[7,14]]",
        "explanation": "[8, 13] overlaps both [7, 9] and [12, 14], so the three join into [7, 14]."
      },
      {
        "input": "intervals = [[1,3]], newInterval = [5,6]",
        "output": "[[1,3],[5,6]]",
        "explanation": "No overlap, so the booking is simply added at the end."
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
        "input": [[[2,4],[7,9],[12,14]],[8,13]],
        "expected": [[2,4],[7,14]]
      },
      {
        "input": [[[1,3]],[5,6]],
        "expected": [[1,3],[5,6]]
      }
    ]
  },
  {
    "id": "merge-intervals",
    "title": "Merge Intervals",
    "slug": "merge-intervals",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "`intervals` lists time ranges `[start, end]` in no particular order. **Combine every group of overlapping ranges into one range** and return the result ordered by start.\n\nRanges that just touch, like `[3, 7]` and `[7, 9]`, count as overlapping.",
    "constraints": ["1 <= intervals.length <= 10^4","Each interval has two numbers","0 <= start <= end <= 10^4"],
    "examples": [
      {
        "input": "intervals = [[5,8],[1,2],[6,10],[12,13]]",
        "output": "[[1,2],[5,10],[12,13]]",
        "explanation": "[5, 8] and [6, 10] overlap and become [5, 10]."
      },
      {
        "input": "intervals = [[3,7],[7,9]]",
        "output": "[[3,9]]",
        "explanation": "The ranges meet at 7, so they join."
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
        "input": [[[5,8],[1,2],[6,10],[12,13]]],
        "expected": [[1,2],[5,10],[12,13]]
      },
      {
        "input": [[[3,7],[7,9]]],
        "expected": [[3,9]]
      }
    ]
  },
  {
    "id": "non-overlapping-intervals",
    "title": "Non-overlapping Intervals",
    "slug": "non-overlapping-intervals",
    "difficulty": "Medium",
    "category": "Dynamic Programming",
    "companies": [],
    "acceptanceRate": "",
    "description": "A meeting room has requests `intervals`, each `[start, end]`. Return the **fewest requests you must cancel** so that no two remaining meetings overlap.\n\nA meeting may start at the exact moment another ends; that is not an overlap.",
    "constraints": ["1 <= intervals.length <= 10^5","Each interval has two numbers","-5 * 10^4 <= start < end <= 5 * 10^4"],
    "examples": [
      {
        "input": "intervals = [[1,4],[2,3],[3,6]]",
        "output": "1",
        "explanation": "Cancel [1, 4]; [2, 3] and [3, 6] fit back to back."
      },
      {
        "input": "intervals = [[0,5],[0,5]]",
        "output": "1",
        "explanation": "Two identical requests: one must go."
      },
      {
        "input": "intervals = [[4,6],[6,8]]",
        "output": "0",
        "explanation": "The meetings only touch at 6."
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
        "input": [[[1,4],[2,3],[3,6]]],
        "expected": 1
      },
      {
        "input": [[[0,5],[0,5]]],
        "expected": 1
      },
      {
        "input": [[[4,6],[6,8]]],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "The values in `nums` are all different. List **every possible selection** of them, from picking nothing to picking everything.\n\nEach selection should appear once. Selections, and the values inside them, can be in any order.",
    "constraints": ["1 <= nums.length <= 10","-10 <= nums[i] <= 10","Values in nums are distinct"],
    "examples": [
      {
        "input": "nums = [4,6]",
        "output": "[[],[4],[6],[4,6]]",
        "explanation": "Two values give four selections: none, either one, or both."
      },
      {
        "input": "nums = [-1]",
        "output": "[[],[-1]]",
        "explanation": "One value: take it or leave it."
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
        "input": [[4,6]],
        "expected": [[],[4],[6],[4,6]]
      },
      {
        "input": [[-1]],
        "expected": [[],[-1]]
      }
    ]
  },
  {
    "id": "combination-sum",
    "title": "Combination Sum",
    "slug": "combination-sum",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "Each value in `candidates` is different, and **any value may be used as many times as you like**. Find every multiset of values that **adds up to `target`** and return them all.\n\nTwo answers are the same if they use the same values the same number of times, so list each one once. Order does not matter.",
    "constraints": ["1 <= candidates.length <= 30","2 <= candidates[i] <= 40","Values in candidates are distinct","1 <= target <= 40"],
    "examples": [
      {
        "input": "candidates = [3,4,5], target = 9",
        "output": "[[3,3,3],[4,5]]",
        "explanation": "3 + 3 + 3 and 4 + 5 both make 9."
      },
      {
        "input": "candidates = [2,6], target = 10",
        "output": "[[2,2,2,2,2],[2,2,6]]",
        "explanation": "Five 2s, or 2 + 2 + 6."
      },
      {
        "input": "candidates = [4], target = 3",
        "output": "[]",
        "explanation": "Only multiples of 4 can be built."
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
        "input": [[3,4,5],9],
        "expected": [[3,3,3],[4,5]]
      },
      {
        "input": [[2,6],10],
        "expected": [[2,2,2,2,2],[2,2,6]]
      },
      {
        "input": [[4],3],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` holds distinct integers. Return **every ordering** of all of them, in any order.",
    "constraints": ["1 <= nums.length <= 6","-10 <= nums[i] <= 10","Values in nums are distinct"],
    "examples": [
      {
        "input": "nums = [5,6,8]",
        "output": "[[5,6,8],[5,8,6],[6,5,8],[6,8,5],[8,5,6],[8,6,5]]",
        "explanation": "Three values can be lined up in 3 x 2 x 1 = 6 ways."
      },
      {
        "input": "nums = [4,7]",
        "output": "[[4,7],[7,4]]",
        "explanation": "Two values, two orderings."
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
        "input": [[5,6,8]],
        "expected": [[5,6,8],[5,8,6],[6,5,8],[6,8,5],[8,5,6],[8,6,5]]
      },
      {
        "input": [[4,7]],
        "expected": [[4,7],[7,4]]
      }
    ]
  },
  {
    "id": "subsets-ii",
    "title": "Subsets II",
    "slug": "subsets-ii",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` **may contain repeated values**. List every distinct selection of its elements (including picking none), where selections that contain the same values the same number of times count as one.\n\nReturn them in any order.",
    "constraints": ["1 <= nums.length <= 10","-10 <= nums[i] <= 10"],
    "examples": [
      {
        "input": "nums = [3,3,1]",
        "output": "[[],[1],[1,3],[1,3,3],[3],[3,3]]",
        "explanation": "The two 3s are interchangeable, so there are six distinct selections, not eight."
      },
      {
        "input": "nums = [7]",
        "output": "[[],[7]]",
        "explanation": "Take the 7 or leave it."
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
        "input": [[3,3,1]],
        "expected": [[],[1],[1,3],[1,3,3],[3],[3,3]]
      },
      {
        "input": [[7]],
        "expected": [[],[7]]
      }
    ]
  },
  {
    "id": "combination-sum-ii",
    "title": "Combination Sum II",
    "slug": "combination-sum-ii",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "`candidates` may contain repeated values, and **each entry can be used at most once**. Return every distinct group of entries that **adds up to `target`**.\n\nGroups with the same values count as one, so list each only once. Order does not matter.",
    "constraints": ["1 <= candidates.length <= 100","1 <= candidates[i] <= 50","1 <= target <= 30"],
    "examples": [
      {
        "input": "candidates = [4,1,3,1,2], target = 5",
        "output": "[[1,1,3],[1,4],[2,3]]",
        "explanation": "1 + 1 + 3, 1 + 4 and 2 + 3 all make 5."
      },
      {
        "input": "candidates = [6,3,3], target = 6",
        "output": "[[3,3],[6]]",
        "explanation": "3 + 3 uses both 3s once each; 6 stands alone."
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
        "input": [[4,1,3,1,2],5],
        "expected": [[1,1,3],[1,4],[2,3]]
      },
      {
        "input": [[6,3,3],6],
        "expected": [[3,3],[6]]
      }
    ]
  },
  {
    "id": "word-search",
    "title": "Word Search",
    "slug": "word-search",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "Can `word` be traced on the letter grid `board`? A trace starts on any cell and moves to a **side neighbour** (up, down, left or right) for each next letter, and **may not revisit a cell**.\n\nReturn `true` if such a trace spells `word`, otherwise `false`.",
    "constraints": ["m == board.length, n == board[i].length","1 <= m, n <= 6","1 <= word.length <= 15","board and word use only English letters"],
    "examples": [
      {
        "input": "board = [[\"C\",\"A\",\"T\"],[\"O\",\"R\",\"E\"],[\"D\",\"O\",\"G\"]], word = \"CORE\"",
        "output": "true",
        "explanation": "C down to O, right to R, right to E."
      },
      {
        "input": "board = [[\"C\",\"A\",\"T\"],[\"O\",\"R\",\"E\"],[\"D\",\"O\",\"G\"]], word = \"TEG\"",
        "output": "true",
        "explanation": "T down to E, down to G."
      },
      {
        "input": "board = [[\"C\",\"A\",\"T\"],[\"O\",\"R\",\"E\"],[\"D\",\"O\",\"G\"]], word = \"CARC\"",
        "output": "false",
        "explanation": "No C touches the R."
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
        "input": [[["C","A","T"],["O","R","E"],["D","O","G"]],"CORE"],
        "expected": true
      },
      {
        "input": [[["C","A","T"],["O","R","E"],["D","O","G"]],"TEG"],
        "expected": true
      },
      {
        "input": [[["C","A","T"],["O","R","E"],["D","O","G"]],"CARC"],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Place `n` queens on an `n x n` chessboard so that **none of them can capture another**: no two share a row, a column or a diagonal.\n\nReturn **all such placements**. Write each placement as `n` strings, one per row, using `\"Q\"` for a queen and `\".\"` for an empty square. Placements may be listed in any order.",
    "constraints": ["1 <= n <= 8"],
    "examples": [
      {
        "input": "n = 4",
        "output": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]",
        "explanation": "A 4 x 4 board has exactly two placements, mirror images of each other."
      },
      {
        "input": "n = 1",
        "output": "[[\"Q\"]]",
        "explanation": "One queen on one square."
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
    "companies": [],
    "acceptanceRate": "",
    "description": "A leaderboard receives scores one at a time and must always report the score in **position `k`** when sorted from highest to lowest (duplicates each take a position).\n\nImplement the `KthLargest` class:\n\n- `KthLargest(k, nums)` sets up the board with `k` and the scores already in `nums`.\n- `add(val)` records a new score and returns the current `k`th highest score.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["1 <= k <= 10^4","0 <= nums.length <= 10^4","-10^4 <= nums[i], val <= 10^4","At most 10^4 calls to add","At least k scores exist whenever add returns"],
    "examples": [
      {
        "input": "operations = [\"KthLargest\",\"add\",\"add\",\"add\",\"add\"], arguments = [[2,[6,1,9]],[4],[7],[10],[2]]",
        "output": "[null,6,7,9,9]",
        "explanation": "With k = 2 and scores 6, 1, 9, the 2nd highest is 6. Adding 4 changes nothing; 7 lifts it to 7; 10 lifts it to 9; 2 changes nothing."
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
        "input": [["KthLargest","add","add","add","add"],[[2,[6,1,9]],[4],[7],[10],[2]]],
        "expected": [null,6,7,9,9]
      }
    ]
  },
  {
    "id": "last-stone-weight",
    "title": "Crushing Rocks",
    "slug": "crushing-rocks",
    "difficulty": "Easy",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "A rock crusher repeatedly takes the **two heaviest rocks** from the pile `stones` and crushes them together. With weights `x <= y`, equal rocks both turn to dust; otherwise only a rock of weight `y - x` goes back on the pile.\n\nWhen at most one rock is left, return its weight, or `0` if the pile is empty.",
    "constraints": ["1 <= stones.length <= 30","1 <= stones[i] <= 1000"],
    "examples": [
      {
        "input": "stones = [6,3,4,2]",
        "output": "1",
        "explanation": "6 and 4 leave 2; then 3 and 2 leave 1; then 2 and 1 leave 1."
      },
      {
        "input": "stones = [5,5,3,3]",
        "output": "0",
        "explanation": "The two 5s cancel, then the two 3s cancel."
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
        "input": [[6,3,4,2]],
        "expected": 1
      },
      {
        "input": [[5,5,3,3]],
        "expected": 0
      }
    ]
  },
  {
    "id": "k-closest-points-to-origin",
    "title": "K Closest Points to Origin",
    "slug": "k-closest-points-to-origin",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "`points` lists map locations as `[x, y]`. Return the **`k` locations nearest to `(0, 0)`** by straight-line distance, in any order.\n\nThe inputs guarantee there is no tie at the cut-off.",
    "constraints": ["1 <= k <= points.length <= 10^4","-10^4 <= x, y <= 10^4","The k nearest points are uniquely determined"],
    "examples": [
      {
        "input": "points = [[2,-1],[0,3]], k = 1",
        "output": "[[2,-1]]",
        "explanation": "[2, -1] is sqrt(5) away and [0, 3] is 3 away."
      },
      {
        "input": "points = [[4,4],[1,-2],[-3,1]], k = 2",
        "output": "[[1,-2],[-3,1]]",
        "explanation": "Squared distances are 32, 5 and 10, so the last two win."
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
        "input": [[[2,-1],[0,3]],1],
        "expected": [[2,-1]]
      },
      {
        "input": [[[4,4],[1,-2],[-3,1]],2],
        "expected": [[1,-2],[-3,1]]
      }
    ]
  },
  {
    "id": "kth-largest-element-in-an-array",
    "title": "Kth Largest Element in an Array",
    "slug": "kth-largest-element-in-an-array",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "Return the value that would be in **position `k` if `nums` were sorted from largest to smallest** (repeated values each take a position).\n\nTry to beat a full sort.",
    "constraints": ["1 <= k <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4"],
    "examples": [
      {
        "input": "nums = [7,2,9,4], k = 2",
        "output": "7",
        "explanation": "Largest first: 9, 7, 4, 2. Position 2 is 7."
      },
      {
        "input": "nums = [5,8,8,1,3], k = 2",
        "output": "8",
        "explanation": "Largest first: 8, 8, 5, 3, 1. Both 8s count."
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
        "input": [[7,2,9,4],2],
        "expected": 7
      },
      {
        "input": [[5,8,8,1,3],2],
        "expected": 8
      }
    ]
  },
  {
    "id": "task-scheduler",
    "title": "Jobs With a Cooldown",
    "slug": "jobs-with-a-cooldown",
    "difficulty": "Medium",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "A machine runs jobs one per time slot. `tasks` lists the jobs, each a capital letter naming its type, and jobs may run in any order. After running a job, the machine must wait **at least `n` slots before running another job of the same type**; it can run other jobs or sit idle meanwhile.\n\nReturn the **fewest slots** needed to finish every job.",
    "constraints": ["1 <= tasks.length <= 10^4","Each task is a capital English letter","0 <= n <= 100"],
    "examples": [
      {
        "input": "tasks = [\"X\",\"X\",\"Y\"], n = 2",
        "output": "4",
        "explanation": "X Y idle X: the second X waits two slots."
      },
      {
        "input": "tasks = [\"P\",\"Q\",\"P\",\"Q\",\"R\"], n = 1",
        "output": "5",
        "explanation": "P Q P Q R fits with no idle slot."
      },
      {
        "input": "tasks = [\"M\",\"M\",\"M\",\"N\"], n = 1",
        "output": "5",
        "explanation": "M N M idle M."
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
        "input": [["X","X","Y"],2],
        "expected": 4
      },
      {
        "input": [["P","Q","P","Q","R"],1],
        "expected": 5
      },
      {
        "input": [["M","M","M","N"],1],
        "expected": 5
      }
    ]
  },
  {
    "id": "find-median-from-data-stream",
    "title": "Find Median from Data Stream",
    "slug": "find-median-from-data-stream",
    "difficulty": "Hard",
    "category": "Backtracking & Heaps",
    "companies": [],
    "acceptanceRate": "",
    "description": "Numbers arrive one at a time, and at any moment you may be asked for the **median** of everything received so far: the middle value once sorted, or the mean of the two middle values when the count is even.\n\nImplement the `MedianFinder` class:\n\n- `MedianFinder()` starts empty.\n- `addNum(num)` receives another integer.\n- `findMedian()` returns the current median. Answers within `10^-5` are accepted.\n\nThe judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.",
    "constraints": ["-10^5 <= num <= 10^5","findMedian is only called after at least one number arrived","At most 5 * 10^4 calls in total"],
    "examples": [
      {
        "input": "operations = [\"MedianFinder\",\"addNum\",\"addNum\",\"findMedian\",\"addNum\",\"findMedian\",\"addNum\",\"findMedian\"], arguments = [[],[4],[10],[],[6],[],[1],[]]",
        "output": "[null,null,null,7,null,6,null,5]",
        "explanation": "After 4 and 10 the median is 7. Adding 6 makes it 6, and adding 1 makes it (4 + 6) / 2 = 5."
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
        "input": [["MedianFinder","addNum","addNum","findMedian","addNum","findMedian","addNum","findMedian"],[[],[4],[10],[],[6],[],[1],[]]],
        "expected": [null,null,null,7,null,6,null,5]
      }
    ]
  },
  {
    "id": "single-number",
    "title": "Single Number",
    "slug": "single-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "In `nums`, **every value shows up exactly twice except one**, which shows up only once. Return that lonely value.\n\nAim for linear time and constant extra memory.",
    "constraints": ["1 <= nums.length <= 3 * 10^4","-3 * 10^4 <= nums[i] <= 3 * 10^4","Exactly one value appears once; all others appear twice"],
    "examples": [
      {
        "input": "nums = [6,3,6]",
        "output": "3",
        "explanation": "6 appears twice, 3 only once."
      },
      {
        "input": "nums = [8,2,9,2,8]",
        "output": "9",
        "explanation": "8 and 2 come in pairs, 9 does not."
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
        "input": [[6,3,6]],
        "expected": 3
      },
      {
        "input": [[8,2,9,2,8]],
        "expected": 9
      }
    ]
  },
  {
    "id": "number-of-1-bits",
    "title": "Number of 1 Bits",
    "slug": "number-of-1-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Write the positive integer `n` in binary as a **32-bit unsigned value** and count **how many of its bits are 1**.",
    "constraints": ["1 <= n <= 2^32 - 1"],
    "examples": [
      {
        "input": "n = 13",
        "output": "3",
        "explanation": "13 is 1101 in binary: three 1s."
      },
      {
        "input": "n = 256",
        "output": "1",
        "explanation": "256 is a single 1 followed by eight 0s."
      },
      {
        "input": "n = 4294967294",
        "output": "31",
        "explanation": "4294967294 is thirty-one 1s and a final 0."
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
        "input": [13],
        "expected": 3
      },
      {
        "input": [256],
        "expected": 1
      },
      {
        "input": [4294967294],
        "expected": 31
      }
    ]
  },
  {
    "id": "counting-bits",
    "title": "Counting Bits",
    "slug": "counting-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "For every whole number `i` from `0` up to `n`, count the **1s in the binary form of `i`**. Return the `n + 1` counts as an array, with the count for `i` at position `i`.\n\nTry to reuse earlier counts instead of examining each number from scratch.",
    "constraints": ["0 <= n <= 10^5"],
    "examples": [
      {
        "input": "n = 3",
        "output": "[0,1,1,2]",
        "explanation": "0, 1, 10 and 11 in binary contain 0, 1, 1 and 2 ones."
      },
      {
        "input": "n = 6",
        "output": "[0,1,1,2,1,2,2]",
        "explanation": "4, 5 and 6 are 100, 101 and 110: 1, 2 and 2 ones."
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
        "input": [3],
        "expected": [0,1,1,2]
      },
      {
        "input": [6],
        "expected": [0,1,1,2,1,2,2]
      }
    ]
  },
  {
    "id": "reverse-bits",
    "title": "Reverse Bits",
    "slug": "reverse-bits",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Write `n` as exactly **32 binary digits** (with leading zeros), **read those digits backwards**, and return the unsigned integer they form.\n\nFor instance `00000000000000000000000000000110` (6) turns into `01100000000000000000000000000000`.",
    "constraints": ["0 <= n <= 2^32 - 1"],
    "examples": [
      {
        "input": "n = 1",
        "output": "2147483648",
        "explanation": "The lowest bit moves to the highest position: 2^31."
      },
      {
        "input": "n = 6",
        "output": "1610612736",
        "explanation": "6 becomes 2^30 + 2^29."
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
        "input": [1],
        "expected": 2147483648
      },
      {
        "input": [6],
        "expected": 1610612736
      }
    ]
  },
  {
    "id": "missing-number",
    "title": "Missing Number",
    "slug": "missing-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "`nums` has `n` different numbers, all chosen from `0, 1, ..., n`. Exactly **one number from that range was left out**. Return it.",
    "constraints": ["n == nums.length","1 <= n <= 10^4","0 <= nums[i] <= n","Values in nums are distinct"],
    "examples": [
      {
        "input": "nums = [4,0,1,2]",
        "output": "3",
        "explanation": "With four numbers the range is 0 to 4, and 3 is absent."
      },
      {
        "input": "nums = [1]",
        "output": "0",
        "explanation": "The range is 0 to 1, and 0 is absent."
      },
      {
        "input": "nums = [2,0,1]",
        "output": "3",
        "explanation": "The range is 0 to 3, and 3 is absent."
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
        "input": [[4,0,1,2]],
        "expected": 3
      },
      {
        "input": [[1]],
        "expected": 0
      },
      {
        "input": [[2,0,1]],
        "expected": 3
      }
    ]
  },
  {
    "id": "sum-of-two-integers",
    "title": "Sum of Two Integers",
    "slug": "sum-of-two-integers",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Add the integers `a` and `b` and return the result, **without using the `+` or `-` operators** anywhere in your code.\n\nHint: binary addition can be split into a sum without carries (XOR) and the carries themselves (AND, shifted left).",
    "constraints": ["-1000 <= a, b <= 1000"],
    "examples": [
      {
        "input": "a = 4, b = 9",
        "output": "13",
        "explanation": "4 + 9 = 13."
      },
      {
        "input": "a = -6, b = 2",
        "output": "-4",
        "explanation": "-6 + 2 = -4."
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
        "input": [4,9],
        "expected": 13
      },
      {
        "input": [-6,2],
        "expected": -4
      }
    ]
  },
  {
    "id": "reverse-integer",
    "title": "Reverse Integer",
    "slug": "reverse-integer",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Return the 32-bit signed integer `x` with its **decimal digits in reverse order**, keeping its sign. If the reversed number does not fit in `[-2^31, 2^31 - 1]`, return `0` instead.\n\nPretend you cannot use 64-bit integers.",
    "constraints": ["-2^31 <= x <= 2^31 - 1"],
    "examples": [
      {
        "input": "x = 456",
        "output": "654",
        "explanation": "456 backwards is 654."
      },
      {
        "input": "x = -890",
        "output": "-98",
        "explanation": "The minus sign stays in front: -890 becomes -98 (the leading zero drops)."
      },
      {
        "input": "x = 1000",
        "output": "1",
        "explanation": "1000 backwards is 0001, which is 1."
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
        "input": [456],
        "expected": 654
      },
      {
        "input": [-890],
        "expected": -98
      },
      {
        "input": [1000],
        "expected": 1
      }
    ]
  },
  {
    "id": "palindrome-number",
    "title": "Palindrome Number",
    "slug": "palindrome-number",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Return `true` if the decimal digits of the integer `x` **read the same left to right as right to left**, and `false` otherwise. A minus sign counts as a character, so negative numbers never qualify.\n\nAs a challenge, solve it with arithmetic only, without turning `x` into a string.",
    "constraints": ["-2^31 <= x <= 2^31 - 1"],
    "examples": [
      {
        "input": "x = 4554",
        "output": "true",
        "explanation": "4554 is the same in both directions."
      },
      {
        "input": "x = -707",
        "output": "false",
        "explanation": "Backwards it would read 707-."
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
        "input": [4554],
        "expected": true
      },
      {
        "input": [-707],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Turn the Roman numeral `s` into an ordinary integer. The letters are worth `I = 1`, `V = 5`, `X = 10`, `L = 50`, `C = 100`, `D = 500` and `M = 1000`.\n\nValues are usually added from left to right. The exception: when a letter is **worth less than the letter right after it**, it is subtracted instead (`IV = 4`, `XC = 90`, `CM = 900`, and so on).",
    "constraints": ["1 <= s.length <= 15","s uses only I, V, X, L, C, D and M","s is a valid numeral between 1 and 3999"],
    "examples": [
      {
        "input": "s = \"XIV\"",
        "output": "14",
        "explanation": "X + IV = 10 + 4."
      },
      {
        "input": "s = \"LXXX\"",
        "output": "80",
        "explanation": "L + XXX = 50 + 30."
      },
      {
        "input": "s = \"CDXCVII\"",
        "output": "497",
        "explanation": "CD + XC + VII = 400 + 90 + 7."
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
        "input": ["XIV"],
        "expected": 14
      },
      {
        "input": ["LXXX"],
        "expected": 80
      },
      {
        "input": ["CDXCVII"],
        "expected": 497
      }
    ]
  },
  {
    "id": "integer-to-roman",
    "title": "Integer to Roman",
    "slug": "integer-to-roman",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Write `num` as a **Roman numeral** using `I = 1`, `V = 5`, `X = 10`, `L = 50`, `C = 100`, `D = 500` and `M = 1000`.\n\nBuild it from the largest value downwards. Where a digit is 4 or 9, use the subtractive pairs `IV`, `IX`, `XL`, `XC`, `CD` or `CM`, so no letter ever appears more than three times in a row.",
    "constraints": ["1 <= num <= 3999"],
    "examples": [
      {
        "input": "num = 14",
        "output": "\"XIV\"",
        "explanation": "10 + 4 is X + IV."
      },
      {
        "input": "num = 80",
        "output": "\"LXXX\"",
        "explanation": "50 + 30 is L + XXX."
      },
      {
        "input": "num = 497",
        "output": "\"CDXCVII\"",
        "explanation": "400 + 90 + 7 is CD + XC + VII."
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
        "input": [14],
        "expected": "XIV"
      },
      {
        "input": [80],
        "expected": "LXXX"
      },
      {
        "input": [497],
        "expected": "CDXCVII"
      }
    ]
  },
  {
    "id": "powx-n",
    "title": "Pow(x, n)",
    "slug": "powx-n",
    "difficulty": "Medium",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "Compute `x` raised to the whole-number power `n` (which may be negative or zero) and return it.\n\nAnswers within `10^-5` are accepted. With exponents up to two billion, multiplying one step at a time is too slow, so use **repeated squaring**.",
    "constraints": ["-100.0 < x < 100.0","-2^31 <= n <= 2^31 - 1","n is a whole number","x is not zero, or n > 0","-10^4 <= x^n <= 10^4"],
    "examples": [
      {
        "input": "x = 3, n = 4",
        "output": "81",
        "explanation": "3 x 3 x 3 x 3 = 81."
      },
      {
        "input": "x = 1.5, n = 2",
        "output": "2.25",
        "explanation": "1.5 squared is 2.25."
      },
      {
        "input": "x = 4, n = -1",
        "output": "0.25",
        "explanation": "A negative power flips the result: 4^-1 = 1 / 4."
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
        "input": [3,4],
        "expected": 81
      },
      {
        "input": [1.5,2],
        "expected": 2.25
      },
      {
        "input": [4,-1],
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
    "companies": [],
    "acceptanceRate": "",
    "description": "Return the **largest whole number whose square is at most `x`**, that is, the square root of `x` rounded down.\n\nBuilt-in power or square-root helpers (`Math.sqrt`, `x ** 0.5` and friends) are off limits.",
    "constraints": ["0 <= x <= 2^31 - 1"],
    "examples": [
      {
        "input": "x = 9",
        "output": "3",
        "explanation": "3 x 3 = 9 exactly."
      },
      {
        "input": "x = 15",
        "output": "3",
        "explanation": "3 x 3 = 9 fits under 15, but 4 x 4 = 16 does not."
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
        "input": [9],
        "expected": 3
      },
      {
        "input": [15],
        "expected": 3
      }
    ]
  },
  {
    "id": "plus-one",
    "title": "Plus One",
    "slug": "plus-one",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "A very long number is stored digit by digit in `digits`, **most significant digit first**, with no leading zeros. Add `1` to it and return the new digit array.",
    "constraints": ["1 <= digits.length <= 100","0 <= digits[i] <= 9","No leading zeros"],
    "examples": [
      {
        "input": "digits = [2,7,9]",
        "output": "[2,8,0]",
        "explanation": "279 + 1 = 280: the 9 rolls over and carries."
      },
      {
        "input": "digits = [5]",
        "output": "[6]",
        "explanation": "5 + 1 = 6."
      },
      {
        "input": "digits = [9,9]",
        "output": "[1,0,0]",
        "explanation": "99 + 1 = 100 needs an extra digit."
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
        "input": [[2,7,9]],
        "expected": [2,8,0]
      },
      {
        "input": [[5]],
        "expected": [6]
      },
      {
        "input": [[9,9]],
        "expected": [1,0,0]
      }
    ]
  },
  {
    "id": "add-binary",
    "title": "Add Binary",
    "slug": "add-binary",
    "difficulty": "Easy",
    "category": "Math & Bit Manipulation",
    "companies": [],
    "acceptanceRate": "",
    "description": "`a` and `b` are numbers written in binary as strings of `0`s and `1`s. Return **their sum, also written in binary**.",
    "constraints": ["1 <= a.length, b.length <= 10^4","Both strings contain only \"0\" and \"1\"","No leading zeros, except the string \"0\" itself"],
    "examples": [
      {
        "input": "a = \"101\", b = \"11\"",
        "output": "\"1000\"",
        "explanation": "5 + 3 = 8, which is 1000 in binary."
      },
      {
        "input": "a = \"1001\", b = \"110\"",
        "output": "\"1111\"",
        "explanation": "9 + 6 = 15, which is 1111."
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
        "input": ["101","11"],
        "expected": "1000"
      },
      {
        "input": ["1001","110"],
        "expected": "1111"
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
