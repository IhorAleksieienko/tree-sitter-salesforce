/**
 * Tree-Sitter Salesforce Interactive WebAssembly Playground
 * Client-side driver for AST visualization and live parsing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sample Code Database
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLES = {
  apex: {
    "DML & Security Modes": `public with sharing class AccountService {
    public static void processAccounts(List<Account> accts) {
        // DML with security mode
        insert as user accts;

        System.runAs(testUser) {
            update as system accts;
        }
    }
}`,
    "Constructor Chaining & Generics": `public class OrderHandler extends BaseHandler<Order> implements Database.Batchable<sObject> {
    public OrderHandler(String orderId) {
        this(orderId, true);
    }

    public OrderHandler(String orderId, Boolean autoCommit) {
        super(orderId);
    }
}`,
    "Trigger with Member Declarations": `trigger AccountTrigger on Account (before insert, after update) {
    private static final String DEFAULT_TIER = 'Standard';

    private void validateTier(Account a) {
        if (a.AnnualRevenue == null) {
            a.Rating = DEFAULT_TIER;
        }
    }

    for (Account a : Trigger.new) {
        validateTier(a);
    }
}`,
    "Switch on SObject & Type Patterns": `switch on sObj {
    when Account a, Contact c {
        System.debug('Matched Account or Contact: ' + sObj.Id);
    }
    when Opportunity opp {
        System.debug('Matched Opportunity: ' + opp.Amount);
    }
    when else {
        System.debug('Default fallback');
    }
}`,
    "Map Literal & Multi-Line String": `Map<String, Object> config = new Map<String, Object>{
    'query' => '''SELECT Id, Name
                  FROM Account
                  WHERE Active__c = 'Yes' ''',
    'retries' => 3,
    'priority' => High.class
};`
  },

  apex_anon: {
    "DML & SOQL Execution": `Account a = new Account(Name = 'Acme Global');
insert as user a;

List<Account> saved = [SELECT Id, Name FROM Account WHERE Id = :a.Id];
System.debug('Created: ' + saved);`,
    "Exception & Flow Control": `try {
    Opportunity opp = [SELECT Id, StageName FROM Opportunity LIMIT 1];
    switch on opp.StageName {
        when 'Closed Won' {
            System.debug('Opportunity Won!');
        }
        when else {
            System.debug('In progress');
        }
    }
} catch (QueryException qe) {
    System.debug(LoggingLevel.ERROR, 'No records found: ' + qe.getMessage());
}`
  },

  soql: {
    "Aggregates with ROLLUP & CUBE": `SELECT StageName, LeadSource, GROUPING(StageName) grpStage, SUM(Amount) totalRevenue
FROM Opportunity
GROUP BY ROLLUP(StageName, LeadSource)
HAVING SUM(Amount) > 50000`,
    "Date Functions & convertTimezone": `SELECT CALENDAR_MONTH(CreatedDate), convertTimezone(CreatedDate), COUNT(Id)
FROM Case
WHERE CreatedDate >= 2026-01-01T00:00:00Z
  AND ShiftTime__c = 14:30:00.000Z
GROUP BY CALENDAR_MONTH(CreatedDate), convertTimezone(CreatedDate)`,
    "Dynamic FORMULA & ALL ROWS": `SELECT Id, Name, IsArchived
FROM Product2
WHERE FORMULA('UnitPrice * Quantity') > 1000
  AND IsArchived = true
ORDER BY Name ASC NULLS LAST
LIMIT 50
ALL ROWS`,
    "USING LOOKUP & RecordVisibility": `SELECT Id, Name, Account.Type
FROM Contact
USING LOOKUP (AccountId = :targetAccId)
WITH RecordVisibilityContext(maxDescriptorPerRecord=50, supportedObjectType='Account')
WITH USER_MODE`
  },

  sosl: {
    "Braces Search & Projections": `FIND {Acme* OR "Global Media"} IN ALL FIELDS
RETURNING Account(Id, Name, toLabel(Type), convertCurrency(AnnualRevenue)),
          Contact(Id, FirstName, LastName, FORMAT(CreatedDate))`,
    "Modern WITH Clauses": `FIND {Cloud Service} IN ALL FIELDS
RETURNING KnowledgeArticleVersion(Title, Summary)
WITH USER_MODE
WITH SNIPPET (TARGET_LENGTH = 150)
WITH METADATA = 'SearchConfig'
WITH NETWORK IN ('0DB000000000001', '0DB000000000002')
LIMIT 20`
  },

  formula: {
    "Validation Rule with Geo & Temporal": `AND(
    ISBLANK(ShippingPostalCode),
    DISTANCE(GEOLOCATION(BillingLatitude, BillingLongitude), GEOLOCATION(37.7749, -122.4194), 'km') > 50,
    ISOWEEK(DATEVALUE(CreatedDate)) == 32
)`,
    "IMAGE Function & Global Context": `IF(
    $Permission.CanViewSensitiveData,
    IMAGE('/resource/badges/' & $RecordType.Name & '.png', 'Verified Badge', 32, 32),
    IMAGE('/resource/badges/default.png', 'Default') & ' (' & $User.Username & ')'
)`
  },

  sflog: {
    "Execution Trace & SOQL / DML": `67.0 APEX_CODE,FINEST;DB,INFO;SYSTEM,DEBUG
14:32:01.042 (42105102)|USER_INFO|[EXTERNAL]|0055e000000xxxx|user@example.com|(GMT-07:00) Pacific Daylight Time (America/Los_Angeles)|GMT-07:00
14:32:01.043 (43100200)|EXECUTION_STARTED
14:32:01.043 (43201500)|CODE_UNIT_STARTED|[EXTERNAL]|01q5e000000xxxx|AccountTrigger on Account trigger event BeforeInsert
14:32:01.050 (50123000)|METHOD_ENTRY|[3]|01p5e000000yyyy|AccountService.validate()
14:32:01.052 (52301000)|USER_DEBUG|[5]|DEBUG|Processing 10 accounts
14:32:01.055 (55400000)|SOQL_EXECUTE_BEGIN|[12]|Aggregations:0|SELECT Id, Name FROM Account WHERE Id IN :tmpVar1
14:32:01.060 (60100000)|SOQL_EXECUTE_END|[12]|Rows:10
14:32:01.065 (65200000)|METHOD_EXIT|[3]|AccountService.validate()
14:32:01.070 (70000000)|CODE_UNIT_FINISHED|AccountTrigger on Account trigger event BeforeInsert
14:32:01.082 (82000000)|EXECUTION_FINISHED`,
    "Cumulative Governor Limits": `14:32:01.075 (75000000)|CUMULATIVE_LIMIT_USAGE
14:32:01.075 (75100000)|LIMIT_USAGE_FOR_NS|(default)|
  Number of SOQL queries: 1 out of 100
  Number of query rows: 10 out of 50000
  Number of SOSL queries: 0 out of 20
  Number of DML statements: 0 out of 150
  Number of DML rows: 0 out of 10000
  Maximum CPU time: 25 out of 10000
  Maximum heap size: 1045 out of 6000000
  Number of callouts: 0 out of 100
14:32:01.080 (80000000)|CUMULATIVE_LIMIT_USAGE_END`,
    "Exception & Stack Trace": `14:32:01.051 (51000000)|VARIABLE_SCOPE_BEGIN|[7]|acc|Account|true|false
14:32:01.052 (52000000)|VARIABLE_ASSIGNMENT|[7]|acc|{"Name":"Test"}|0x12345
14:32:01.053 (53000000)|EXCEPTION_THROWN|[15]|System.NullPointerException: Attempt to de-reference a null object
Class.AccountService.validate: line 15, column 1
AnonymousBlock: line 2, column 1
14:32:01.054 (54000000)|FATAL_ERROR|System.NullPointerException: Attempt to de-reference a null object`
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// State & DOM Elements
// ─────────────────────────────────────────────────────────────────────────────
let currentLang = "apex";
let parser = null;
let languages = {};
let wasmReady = false;
let currentParseTree = null;
let debounceTimer = null;
let currentView = "tree";

const DOM = {
  languageNav: document.getElementById("languageNav"),
  sampleSelect: document.getElementById("sampleSelect"),
  codeEditor: document.getElementById("codeEditor"),
  lineNumbers: document.getElementById("lineNumbers"),
  editorStats: document.getElementById("editorStats"),
  cursorPos: document.getElementById("cursorPos"),
  langDisplay: document.getElementById("langDisplay"),
  btnFormat: document.getElementById("btnFormat"),
  btnCopy: document.getElementById("btnCopy"),
  resizer: document.getElementById("resizer"),
  treeFilter: document.getElementById("treeFilter"),
  btnExpandAll: document.getElementById("btnExpandAll"),
  btnCollapseAll: document.getElementById("btnCollapseAll"),
  toggleAnonymous: document.getElementById("toggleAnonymous"),
  treeRoot: document.getElementById("treeRoot"),
  sexpOutput: document.getElementById("sexpOutput"),
  jsonOutput: document.getElementById("jsonOutput"),
  statusBanner: document.getElementById("statusBanner"),
  statusMessage: document.getElementById("statusMessage"),
  metricTime: document.getElementById("metricTime"),
  metricNodes: document.getElementById("metricNodes"),
  metricDepth: document.getElementById("metricDepth"),
  metricStatus: document.getElementById("metricStatus"),
  viewTabs: document.querySelectorAll(".view-tab"),
  viewPanels: {
    tree: document.getElementById("treeViewContainer"),
    sexp: document.getElementById("sexpViewContainer"),
    json: document.getElementById("jsonViewContainer")
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialization & WebAssembly Loader
// ─────────────────────────────────────────────────────────────────────────────
async function initPlayground() {
  setupEventListeners();
  updateSampleDropdown();
  loadSample(Object.keys(SAMPLES[currentLang])[0]);

  try {
    updateStatus("Loading Tree-sitter WebAssembly core...", "info");
    if (typeof TreeSitter === "undefined") {
      throw new Error("TreeSitter WebAssembly library not loaded");
    }

    await TreeSitter.init({
      locateFile(scriptName) {
        return `wasm/${scriptName}`;
      }
    });

    parser = new TreeSitter();
    await loadGrammar(currentLang);
    wasmReady = true;
    updateStatus("WebAssembly parser ready • API v67.0", "success");
    reparse();
  } catch (err) {
    console.warn("WASM Engine Notice:", err);
    updateStatus("Running with syntax parser • (Compile WASM via scripts/build-wasm-playground.js for full native speed)", "warning");
    reparse();
  }
}

async function loadGrammar(lang) {
  if (languages[lang] || !parser) return;

  const wasmFileName = `tree-sitter-${lang}.wasm`;
  const possiblePaths = [
    `wasm/${wasmFileName}`,
    `../../bindings/web/${wasmFileName}`,
    `../bindings/web/${wasmFileName}`,
    wasmFileName
  ];

  for (const p of possiblePaths) {
    try {
      const language = await TreeSitter.Language.load(p);
      languages[lang] = language;
      parser.setLanguage(language);
      return;
    } catch {
      // Try next path
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Listeners Setup
// ─────────────────────────────────────────────────────────────────────────────
function setupEventListeners() {
  // Language Switch
  DOM.languageNav.addEventListener("click", async (e) => {
    const btn = e.target.closest(".lang-tab");
    if (!btn || btn.dataset.lang === currentLang) return;

    document.querySelectorAll(".lang-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentLang = btn.dataset.lang;
    DOM.langDisplay.textContent = `Language: ${btn.textContent}`;
    updateSampleDropdown();
    loadSample(Object.keys(SAMPLES[currentLang])[0]);

    if (wasmReady) {
      await loadGrammar(currentLang);
    }
    reparse();
  });

  // Sample Selection
  DOM.sampleSelect.addEventListener("change", (e) => {
    loadSample(e.target.value);
    reparse();
  });

  // Editor Input & Cursor Tracking
  DOM.codeEditor.addEventListener("input", () => {
    updateLineNumbers();
    updateEditorStats();
    scheduleReparse();
  });

  DOM.codeEditor.addEventListener("scroll", () => {
    DOM.lineNumbers.scrollTop = DOM.codeEditor.scrollTop;
  });

  DOM.codeEditor.addEventListener("keyup", updateCursorPos);
  DOM.codeEditor.addEventListener("click", updateCursorPos);

  // View Mode Tabs
  DOM.viewTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      DOM.viewTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      currentView = tab.dataset.view;
      Object.values(DOM.viewPanels).forEach(p => p.classList.remove("active"));
      DOM.viewPanels[currentView].classList.add("active");
      renderActiveView();
    });
  });

  // Filter in Tree
  DOM.treeFilter.addEventListener("input", (e) => {
    filterTreeNodes(e.target.value.trim().toLowerCase());
  });

  // Tree Controls
  DOM.btnExpandAll.addEventListener("click", () => {
    document.querySelectorAll(".node-children").forEach(el => el.classList.remove("hidden"));
    document.querySelectorAll(".node-toggle").forEach(el => el.classList.remove("collapsed"));
  });

  DOM.btnCollapseAll.addEventListener("click", () => {
    document.querySelectorAll(".tree-root > .tree-node .node-children").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tree-root > .tree-node .node-toggle").forEach(el => el.classList.add("collapsed"));
  });

  DOM.toggleAnonymous.addEventListener("change", () => {
    renderActiveView();
  });

  // Reset / Format Sample
  DOM.btnFormat.addEventListener("click", () => {
    loadSample(DOM.sampleSelect.value);
    reparse();
  });

  // Copy Action
  DOM.btnCopy.addEventListener("click", async () => {
    let contentToCopy = "";
    if (currentView === "sexp") {
      contentToCopy = DOM.sexpOutput.textContent;
    } else if (currentView === "json") {
      contentToCopy = DOM.jsonOutput.textContent;
    } else {
      contentToCopy = DOM.sexpOutput.textContent;
    }

    try {
      await navigator.clipboard.writeText(contentToCopy);
      const originalText = DOM.btnCopy.innerHTML;
      DOM.btnCopy.innerHTML = `<span style="color: var(--color-emerald)">✓ Copied!</span>`;
      setTimeout(() => { DOM.btnCopy.innerHTML = originalText; }, 1500);
    } catch {
      alert("Unable to copy to clipboard");
    }
  });

  // Resizer logic
  setupResizer();
}

function setupResizer() {
  let isDragging = false;

  DOM.resizer.addEventListener("mousedown", (e) => {
    isDragging = true;
    DOM.resizer.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const containerRect = document.querySelector(".main-container").getBoundingClientRect();
    const leftWidth = e.clientX - containerRect.left;
    const percentage = (leftWidth / containerRect.width) * 100;

    if (percentage > 20 && percentage < 80) {
      document.querySelector(".editor-pane").style.flex = `0 0 ${percentage}%`;
      document.querySelector(".ast-pane").style.flex = `1 1 0`;
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      DOM.resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample & Editor Management
// ─────────────────────────────────────────────────────────────────────────────
function updateSampleDropdown() {
  DOM.sampleSelect.innerHTML = "";
  const samples = SAMPLES[currentLang] || {};
  Object.keys(samples).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    DOM.sampleSelect.appendChild(opt);
  });
}

function loadSample(name) {
  const code = (SAMPLES[currentLang] && SAMPLES[currentLang][name]) || "";
  DOM.codeEditor.value = code;
  updateLineNumbers();
  updateEditorStats();
  updateCursorPos();
}

function updateLineNumbers() {
  const lineCount = DOM.codeEditor.value.split("\n").length;
  DOM.lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
}

function updateEditorStats() {
  const text = DOM.codeEditor.value;
  const lines = text.split("\n").length;
  const chars = text.length;
  DOM.editorStats.textContent = `${lines} lines • ${chars} chars`;
}

function updateCursorPos() {
  const pos = DOM.codeEditor.selectionStart;
  const text = DOM.codeEditor.value.substring(0, pos);
  const lines = text.split("\n");
  const row = lines.length;
  const col = lines[lines.length - 1].length + 1;
  DOM.cursorPos.textContent = `Ln ${row}, Col ${col}`;
}

function updateStatus(msg, type = "info") {
  DOM.statusMessage.textContent = msg;
  DOM.statusBanner.className = `status-banner ${type}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing & AST Generation
// ─────────────────────────────────────────────────────────────────────────────
function scheduleReparse() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    reparse();
  }, 100);
}

function reparse() {
  const sourceCode = DOM.codeEditor.value;
  const startTime = performance.now();

  let tree = null;
  let hasError = false;

  if (wasmReady && parser && languages[currentLang]) {
    try {
      tree = parser.parse(sourceCode);
      currentParseTree = tree.rootNode;
      hasError = currentParseTree.hasError;
    } catch (err) {
      console.error("Parse error:", err);
      tree = null;
    }
  }

  // Fallback simulator if WASM isn't built yet
  if (!tree) {
    currentParseTree = simulateParseTree(sourceCode, currentLang);
    hasError = currentParseTree.hasError;
  }

  const elapsed = (performance.now() - startTime).toFixed(2);
  const stats = collectTreeStats(currentParseTree);

  DOM.metricTime.textContent = `⚡ ${elapsed} ms`;
  DOM.metricNodes.textContent = `🌿 ${stats.totalNodes} nodes`;
  DOM.metricDepth.textContent = `📐 Depth: ${stats.maxDepth}`;

  if (hasError) {
    DOM.metricStatus.className = "status-tag error";
    DOM.metricStatus.textContent = "⚠ Syntax Error Detected";
  } else {
    DOM.metricStatus.className = "status-tag success";
    DOM.metricStatus.textContent = "✓ Valid CST";
  }

  renderActiveView();
}

function collectTreeStats(node, depth = 1) {
  if (!node) return { totalNodes: 0, maxDepth: 0 };
  let totalNodes = 1;
  let maxDepth = depth;

  const children = node.children || [];
  for (const child of children) {
    const childStats = collectTreeStats(child, depth + 1);
    totalNodes += childStats.totalNodes;
    if (childStats.maxDepth > maxDepth) maxDepth = childStats.maxDepth;
  }
  return { totalNodes, maxDepth };
}

// ─────────────────────────────────────────────────────────────────────────────
// View Rendering (Tree, S-Exp, JSON)
// ─────────────────────────────────────────────────────────────────────────────
function renderActiveView() {
  if (!currentParseTree) return;

  if (currentView === "tree") {
    renderCstTree(currentParseTree);
  } else if (currentView === "sexp") {
    DOM.sexpOutput.textContent = formatSExpression(currentParseTree);
  } else if (currentView === "json") {
    DOM.jsonOutput.textContent = JSON.stringify(formatJsonAst(currentParseTree), null, 2);
  }
}

function renderCstTree(rootNode) {
  DOM.treeRoot.innerHTML = "";
  const showTokens = DOM.toggleAnonymous.checked;

  function buildNodeElement(node, fieldName = null, isRoot = false) {
    const isNamed = node.isNamed !== false;
    if (!isNamed && !showTokens) return null;

    const nodeEl = document.createElement("div");
    nodeEl.className = "tree-node" + (isRoot ? " tree-root" : "");

    const row = document.createElement("div");
    row.className = "node-row";
    row.dataset.start = node.startIndex ?? 0;
    row.dataset.end = node.endIndex ?? 0;

    const hasChildren = (node.children && node.children.length > 0);

    // Expand/Collapse Chevron
    const toggle = document.createElement("span");
    toggle.className = `node-toggle ${hasChildren ? "" : "leaf"}`;
    toggle.innerHTML = hasChildren ? "▼" : "";
    row.appendChild(toggle);

    // Field Name (if any)
    if (fieldName) {
      const fieldSpan = document.createElement("span");
      fieldSpan.className = "node-field-name";
      fieldSpan.textContent = `${fieldName}:`;
      row.appendChild(fieldSpan);
    }

    // Node Type Name
    const typeSpan = document.createElement("span");
    const isError = node.type === "ERROR" || node.isMissing;
    typeSpan.className = `node-type-name ${isNamed ? "" : "anonymous"} ${isError ? "error" : ""}`;
    typeSpan.textContent = isNamed ? node.type : `"${node.type}"`;
    row.appendChild(typeSpan);

    // Range metadata [start - end]
    const rangeSpan = document.createElement("span");
    rangeSpan.className = "node-range";
    const startPoint = node.startPosition || { row: 0, column: 0 };
    const endPoint = node.endPosition || { row: 0, column: 0 };
    rangeSpan.textContent = `[${startPoint.row}, ${startPoint.column}] - [${endPoint.row}, ${endPoint.column}]`;
    row.appendChild(rangeSpan);

    // Preview snippet for leaf nodes
    if (!hasChildren && node.text) {
      const textPreview = document.createElement("span");
      textPreview.className = "node-text-preview";
      textPreview.textContent = node.text.replace(/\n/g, "↵");
      row.appendChild(textPreview);
    }

    nodeEl.appendChild(row);

    // Children container
    if (hasChildren) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "node-children";

      node.children.forEach((child, index) => {
        const childFieldName = node.fieldNameForChild ? node.fieldNameForChild(index) : (child.fieldName || null);
        const childEl = buildNodeElement(child, childFieldName, false);
        if (childEl) childrenContainer.appendChild(childEl);
      });

      nodeEl.appendChild(childrenContainer);

      // Toggle click
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        const isCollapsed = toggle.classList.toggle("collapsed");
        childrenContainer.classList.toggle("hidden", isCollapsed);

        // Highlight selection in editor
        selectEditorRange(node.startIndex, node.endIndex);
      });
    } else {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        selectEditorRange(node.startIndex, node.endIndex);
      });
    }

    return nodeEl;
  }

  const treeDOM = buildNodeElement(rootNode, null, true);
  if (treeDOM) DOM.treeRoot.appendChild(treeDOM);
}

function selectEditorRange(start, end) {
  if (start == null || end == null) return;
  DOM.codeEditor.focus();
  DOM.codeEditor.setSelectionRange(start, end);
  updateCursorPos();
}

function filterTreeNodes(query) {
  const rows = DOM.treeRoot.querySelectorAll(".node-row");
  if (!query) {
    rows.forEach(r => r.classList.remove("highlight-match"));
    return;
  }

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const isMatch = text.includes(query);
    row.classList.toggle("highlight-match", isMatch);

    if (isMatch) {
      // Ensure all parents are expanded
      let parent = row.closest(".node-children");
      while (parent) {
        parent.classList.remove("hidden");
        const toggle = parent.parentElement.querySelector(".node-toggle");
        if (toggle) toggle.classList.remove("collapsed");
        parent = parent.parentElement.closest(".node-children");
      }
    }
  });
}

function formatSExpression(node, depth = 0) {
  if (!node) return "";
  const isNamed = node.isNamed !== false;
  const showTokens = DOM.toggleAnonymous.checked;

  if (!isNamed && !showTokens) return "";

  const indent = "  ".repeat(depth);
  const children = (node.children || []).filter(c => c.isNamed !== false || showTokens);

  if (children.length === 0) {
    return `${indent}(${node.type}${node.text ? ` "${escapeQuotes(node.text)}"` : ""})`;
  }

  const childLines = children.map(c => formatSExpression(c, depth + 1)).filter(Boolean).join("\n");
  return `${indent}(${node.type}\n${childLines})`;
}

function formatJsonAst(node) {
  if (!node) return null;
  const isNamed = node.isNamed !== false;
  const showTokens = DOM.toggleAnonymous.checked;

  if (!isNamed && !showTokens) return null;

  const res = {
    type: node.type,
    named: isNamed,
    start: node.startPosition || { row: 0, column: 0 },
    end: node.endPosition || { row: 0, column: 0 }
  };

  if (node.children && node.children.length > 0) {
    const children = node.children.map(c => formatJsonAst(c)).filter(Boolean);
    if (children.length > 0) res.children = children;
  } else if (node.text) {
    res.text = node.text;
  }
  return res;
}

function escapeQuotes(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback AST Simulator (Interactive preview if WASM build step is pending)
// ─────────────────────────────────────────────────────────────────────────────
function simulateParseTree(code, lang) {
  const lines = code.split("\n");
  const rootType = lang === "soql" ? "query" : (lang === "sosl" ? "sosl_query" : (lang === "formula" ? "formula_expression" : "compilation_unit"));

  function createSimNode(type, text, startRow, startCol, endRow, endCol, children = [], isNamed = true, fieldName = null) {
    return {
      type,
      text,
      isNamed,
      fieldName,
      startPosition: { row: startRow, column: startCol },
      endPosition: { row: endRow, column: endCol },
      startIndex: 0,
      endIndex: text.length,
      children,
      hasError: false
    };
  }

  // Simple token/block recognizer
  const children = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      children.push(createSimNode("comment", trimmed, idx, line.indexOf(trimmed), idx, line.length));
    } else if (trimmed.match(/^(public|private|global|protected)\s+(with|without|inherited)\s+sharing\s+class\s+(\w+)/i)) {
      const match = trimmed.match(/class\s+(\w+)/i);
      children.push(createSimNode("class_declaration", trimmed, idx, 0, idx, line.length, [
        createSimNode("modifiers", "public with sharing", idx, 0, idx, 19),
        createSimNode("identifier", match ? match[1] : "Class", idx, line.indexOf(match ? match[1] : ""), idx, line.length, [], true, "name")
      ]));
    } else if (trimmed.match(/^SELECT\s+/i)) {
      children.push(createSimNode("select_clause", trimmed, idx, 0, idx, line.length, [
        createSimNode("select_expression_list", trimmed.substring(6), idx, 6, idx, line.length)
      ]));
    } else if (trimmed.match(/^FIND\s+/i)) {
      children.push(createSimNode("find_clause", trimmed, idx, 0, idx, line.length));
    } else {
      children.push(createSimNode("statement", trimmed, idx, 0, idx, line.length));
    }
  });

  return createSimNode(rootType, code, 0, 0, lines.length - 1, (lines[lines.length - 1] || "").length, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap on DOM Ready
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initPlayground);
