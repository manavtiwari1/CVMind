import { assertIdentifier } from './judgeShared.js';

/**
 * Builds the C++ program that runs a submission.
 *
 * The user's code is placed verbatim (with `#line` so compiler messages use the user's line numbers) between
 * the node definitions and a generated `run_test` function. The test data travels as JSON in a file; the program
 * prints one protocol line per test that the host parses. Types come from the problem's trusted `cppSpec`, never
 * from the user's code.
 */

const STATIC_TOP = String.raw`#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* n) : val(x), next(n) {}
};

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode* l, TreeNode* r) : val(x), left(l), right(r) {}
};

`;

const STATIC_BOTTOM = String.raw`
#line 1 "harness.cpp"
struct J {
    enum Type { Null, Bool, Num, Str, Arr };
    Type t = Null;
    bool b = false;
    bool isInt = false;
    long long i = 0;
    double d = 0;
    string s;
    vector<J> a;
};

struct Parser {
    const string& s;
    size_t p;
    Parser(const string& str) : s(str), p(0) {}
    void ws() { while (p < s.size() && isspace((unsigned char)s[p])) p++; }
    J parse() {
        ws();
        J j;
        if (p >= s.size()) throw runtime_error("unexpected end of input");
        char c = s[p];
        if (c == '[') {
            p++;
            j.t = J::Arr;
            ws();
            if (s[p] == ']') { p++; return j; }
            while (true) {
                j.a.push_back(parse());
                ws();
                if (s[p] == ',') { p++; continue; }
                if (s[p] == ']') { p++; break; }
                throw runtime_error("bad json");
            }
            return j;
        }
        if (c == '"') {
            p++;
            j.t = J::Str;
            while (s[p] != '"') {
                if (s[p] == '\\') {
                    p++;
                    char e = s[p];
                    if (e == 'n') j.s += '\n';
                    else if (e == 't') j.s += '\t';
                    else if (e == 'r') j.s += '\r';
                    else if (e == 'u') {
                        unsigned v = 0;
                        for (int k = 0; k < 4; k++) { p++; char h = s[p]; v = v * 16 + (h <= '9' ? h - '0' : (h | 32) - 'a' + 10); }
                        j.s += (char)v;
                    } else j.s += e;
                    p++;
                } else j.s += s[p++];
            }
            p++;
            return j;
        }
        if (s.compare(p, 4, "null") == 0) { p += 4; return j; }
        if (s.compare(p, 4, "true") == 0) { p += 4; j.t = J::Bool; j.b = true; return j; }
        if (s.compare(p, 5, "false") == 0) { p += 5; j.t = J::Bool; return j; }
        size_t q = p;
        bool isFloat = false;
        if (s[q] == '-') q++;
        while (q < s.size() && (isdigit((unsigned char)s[q]) || s[q] == '.' || s[q] == 'e' || s[q] == 'E' || s[q] == '+' || s[q] == '-')) {
            if (s[q] == '.' || s[q] == 'e' || s[q] == 'E') isFloat = true;
            q++;
        }
        string num = s.substr(p, q - p);
        p = q;
        j.t = J::Num;
        j.d = strtod(num.c_str(), nullptr);
        j.isInt = !isFloat;
        if (!isFloat) j.i = strtoll(num.c_str(), nullptr, 10);
        return j;
    }
};

static void fj(const J& j, int& x) { x = j.isInt ? (int)j.i : (int)j.d; }
static void fj(const J& j, unsigned int& x) { x = j.isInt ? (unsigned int)j.i : (unsigned int)j.d; }
static void fj(const J& j, long long& x) { x = j.isInt ? j.i : (long long)j.d; }
static void fj(const J& j, double& x) { x = j.isInt ? (double)j.i : j.d; }
static void fj(const J& j, bool& x) { x = j.b; }
static void fj(const J& j, string& x) { x = j.s; }
template <class T> static void fj(const J& j, vector<T>& v) {
    v.clear();
    for (size_t k = 0; k < j.a.size(); k++) { T t = T(); fj(j.a[k], t); v.push_back(t); }
}
static void fj(const J& j, ListNode*& h) {
    h = nullptr;
    for (size_t k = j.a.size(); k-- > 0;) { ListNode* n = new ListNode((int)j.a[k].i); n->next = h; h = n; }
}
static void fj(const J& j, TreeNode*& r) {
    r = nullptr;
    if (j.a.empty() || j.a[0].t == J::Null) return;
    r = new TreeNode((int)j.a[0].i);
    queue<TreeNode*> q;
    q.push(r);
    size_t k = 1;
    while (!q.empty() && k < j.a.size()) {
        TreeNode* n = q.front(); q.pop();
        if (k < j.a.size() && j.a[k].t != J::Null) { n->left = new TreeNode((int)j.a[k].i); q.push(n->left); }
        k++;
        if (k < j.a.size() && j.a[k].t != J::Null) { n->right = new TreeNode((int)j.a[k].i); q.push(n->right); }
        k++;
    }
}
static ListNode* build_cyclic(const J& values, const J& pos) {
    vector<ListNode*> nodes;
    for (size_t k = 0; k < values.a.size(); k++) nodes.push_back(new ListNode((int)values.a[k].i));
    for (size_t k = 0; k + 1 < nodes.size(); k++) nodes[k]->next = nodes[k + 1];
    int p = (int)pos.i;
    if (!nodes.empty() && p >= 0) nodes.back()->next = nodes[p];
    return nodes.empty() ? nullptr : nodes[0];
}

static void tj(string& o, int x) { o += to_string(x); }
static void tj(string& o, unsigned int x) { o += to_string(x); }
static void tj(string& o, long long x) { o += to_string(x); }
static void tj(string& o, double x) { char b[64]; snprintf(b, sizeof b, "%.12g", x); o += b; }
static void tj(string& o, bool x) { o += x ? "true" : "false"; }
static void tj(string& o, const string& x) {
    o += '"';
    for (size_t k = 0; k < x.size(); k++) {
        unsigned char c = (unsigned char)x[k];
        if (c == '"') o += "\\\"";
        else if (c == '\\') o += "\\\\";
        else if (c == '\n') o += "\\n";
        else if (c == '\t') o += "\\t";
        else if (c == '\r') o += "\\r";
        else if (c < 32) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; }
        else o += (char)c;
    }
    o += '"';
}
template <class T> static void tj(string& o, const vector<T>& v) {
    o += '[';
    for (size_t k = 0; k < v.size(); k++) { if (k) o += ','; tj(o, v[k]); }
    o += ']';
}
static void tj(string& o, ListNode* h) {
    o += '[';
    int guard = 0;
    bool first = true;
    while (h && guard++ < 100000) { if (!first) o += ','; first = false; o += to_string(h->val); h = h->next; }
    o += ']';
}
static void tj(string& o, TreeNode* r) {
    vector<string> out;
    if (r) {
        queue<TreeNode*> q;
        q.push(r);
        int guard = 0;
        while (!q.empty() && guard++ < 100000) {
            TreeNode* n = q.front(); q.pop();
            if (!n) { out.push_back("null"); continue; }
            out.push_back(to_string(n->val));
            q.push(n->left);
            q.push(n->right);
        }
        while (!out.empty() && out.back() == "null") out.pop_back();
    }
    o += '[';
    for (size_t k = 0; k < out.size(); k++) { if (k) o += ','; o += out[k]; }
    o += ']';
}

static void run_test(const J& in, string& out);

static string clean(string s) {
    for (size_t k = 0; k < s.size(); k++) if (s[k] == '\n' || s[k] == '\t' || s[k] == '\r') s[k] = ' ';
    return s;
}

int main(int argc, char** argv) {
    if (argc < 2) return 2;
    ifstream f(argv[1]);
    stringstream ss;
    ss << f.rdbuf();
    string text = ss.str();
    Parser ps(text);
    J all = ps.parse();
    for (size_t ti = 0; ti < all.a.size(); ti++) {
        ostringstream captured;
        streambuf* old = cout.rdbuf(captured.rdbuf());
        string outJson, err;
        double ms = 0;
        bool ok = true;
        try {
            auto t0 = chrono::steady_clock::now();
            run_test(all.a[ti], outJson);
            ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
        } catch (const exception& e) {
            ok = false;
            err = e.what();
        } catch (...) {
            ok = false;
            err = "unknown exception";
        }
        cout.rdbuf(old);
        string log = captured.str();
        if (log.size() > 2000) log.resize(2000);
        printf("\x01" "CVM\t%d\t%.3f\t%s\t%s\n", ok ? 1 : 0, ms, ok ? outJson.c_str() : clean(err).c_str(), clean(log).c_str());
        fflush(stdout);
        if (!ok) break;
    }
    return 0;
}
`;

function cppString(value) {
  return JSON.stringify(String(value));
}

function paramType(type) {
  return assertType(type);
}

/** Only a small, known set of type spellings is allowed into generated source. */
function assertType(type) {
  if (typeof type !== 'string' || !/^(int|long long|double|bool|string|uint32_t|unsigned int|ListNode\*|TreeNode\*|vector<(int|long long|double|bool|string|uint32_t|unsigned int|ListNode\*|TreeNode\*|vector<(int|long long|double|bool|string|vector<(int|string)>)>)>)$/.test(type)) {
    throw new Error(`Unsupported C++ type in problem data: ${String(type).slice(0, 60)}`);
  }
  return type === 'uint32_t' ? 'unsigned int' : type;
}

function functionBody(spec, meta) {
  const lines = [];
  spec.args.forEach((a, i) => {
    const type = paramType(a.type);
    if (meta.adapter === 'cyclic-list') lines.push(`    ListNode* a${i} = build_cyclic(in.a[0], in.a[1]);`);
    else {
      lines.push(`    ${type} a${i}{};`);
      lines.push(`    fj(in.a[${i}], a${i});`);
    }
  });
  lines.push('    Solution sol;');
  lines.push(`    auto r = sol.${assertIdentifier(spec.method)}(${spec.args.map((_, i) => `a${i}`).join(', ')});`);
  lines.push('    tj(out, r);');
  return lines.join('\n');
}

function designBody(spec) {
  const cls = assertIdentifier(spec.className);
  const lines = [];
  lines.push('    const J& ops = in.a[0];');
  lines.push('    const J& argv = in.a[1];');
  const ctorArgs = spec.ctor.map((t, i) => {
    const type = paramType(t);
    lines.push(`    ${type} c${i}{};`);
    lines.push(`    fj(argv.a[0].a[${i}], c${i});`);
    return `c${i}`;
  });
  lines.push(ctorArgs.length ? `    ${cls} obj(${ctorArgs.join(', ')});` : `    ${cls} obj;`);
  lines.push('    out = "[null";');
  lines.push('    for (size_t i = 1; i < ops.a.size(); i++) {');
  lines.push('        const string& op = ops.a[i].s;');
  lines.push('        const J& ag = argv.a[i];');
  lines.push('        if (false) {}');
  for (const m of spec.methods) {
    const name = assertIdentifier(m.name);
    const args = m.args.map((t, k) => {
      const type = paramType(t);
      return { decl: `${type} a${k}{}; fj(ag.a[${k}], a${k});`, use: `a${k}` };
    });
    const call = `obj.${name}(${args.map((a) => a.use).join(', ')})`;
    const body = args.map((a) => a.decl).join(' ');
    if (m.ret === 'void') lines.push(`        else if (op == ${cppString(name)}) { ${body} ${call}; out += ",null"; }`);
    else lines.push(`        else if (op == ${cppString(name)}) { ${body} auto r = ${call}; out += ","; tj(out, r); }`);
  }
  lines.push('        else throw runtime_error("Your class has no method named " + op + ".");');
  lines.push('    }');
  lines.push('    out += "]";');
  return lines.join('\n');
}

export function buildCppSource(userCode, cppSpec, meta = {}) {
  if (!cppSpec) throw new Error('This problem has no C++ signature.');
  const body = cppSpec.kind === 'design' ? designBody(cppSpec) : functionBody(cppSpec, meta);
  return `${STATIC_TOP}#line 1 "solution.cpp"\n${String(userCode ?? '')}\n${STATIC_BOTTOM}\nstatic void run_test(const J& in, string& out) {\n${body}\n}\n`;
}
