export const categories = [
  ['basics', '基础数学输入'], ['sets', '集合与逻辑'], ['equations', '方程与不等式'],
  ['functions', '函数与数列'], ['trigonometry', '三角函数'], ['geometry', '平面几何'],
  ['vectors', '平面向量'], ['analytic', '解析几何'], ['space', '立体几何'],
] as const
export type Category = typeof categories[number][0]
export interface FormulaEntry {
  id: string
  category: Category
  name: string
  aliases: string[]
  latex: string
  example: string
  description: string
  mode?: 'inline' | 'display'
}
type Row = [id: string, name: string, aliases: string, latex: string, example: string, description: string, mode?: 'inline' | 'display']
const raw = String.raw

const rows: Record<Category, Row[]> = {
  basics: [
    ['inline', '行内公式', 'inline 行内', 'a^2+b^2=c^2', 'a^2+b^2=c^2', '在文字中使用 $...$。助手里只输入中间的公式，插入时自动包装。', 'inline'],
    ['display', '独立公式', 'display 块公式', raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, '用 $$ 包裹公式，开始和结束的 $$ 各占一行。', 'display'],
    ['scripts', '上标与下标', 'superscript subscript 次方 下标', raw`a_{n}^{2}`, raw`a_{n+1}=a_n+2`, '^ 表示上标，_ 表示下标。{} 把多个字符组成一个整体；如 x^{10}，花括号本身不显示。'],
    ['fraction', '分数', 'frac fraction', raw`\frac{a}{b}`, raw`\frac{x+1}{x-1}`, '反斜杠 \\ 引出命令。\\frac 后的第一组 {} 是分子，第二组是分母。'],
    ['sqrt', '平方根与 n 次方根', '根号 square root sqrt nth root', raw`\sqrt{x}+\sqrt[n]{x}`, raw`\sqrt{9}=3,\quad\sqrt[3]{8}=2`, '{} 内填被开方数；可选的 [n] 指定根指数。'],
    ['brackets', '括号与自动伸缩括号', 'parentheses brackets left right', raw`\left(\frac{a}{b}\right)`, raw`\left[\frac{x+1}{2}\right]^2`, '普通括号直接输入。\\left 与 \\right 成对使用，大小随内容变化；显示花括号用 \\{ 和 \\}。'],
    ['greek', '希腊字母', 'greek alpha beta gamma theta lambda', raw`\alpha,\beta,\gamma,\theta,\lambda,\pi`, raw`y=\sin(\omega x+\varphi)`, '字母名称前加反斜杠，如 \\alpha。命令后接英文字母时要用空格或 {} 分隔。'],
    ['operators', '数学运算符', 'operator times div pm cdot', raw`a\times b,\quad a\div b,\quad a\pm b`, raw`(a+b)(a-b)=a^2-b^2`, '乘号用 \\times 或 \\cdot，除号用 \\div，正负号用 \\pm。'],
    ['aligned', '多行公式与对齐', 'aligned multiline 换行 对齐', raw`\begin{aligned}a&=b+c\\&=d\end{aligned}`, raw`\begin{aligned}(x+1)^2&=x^2+2x+1\\&=(x^2+1)+2x\end{aligned}`, '& 指定对齐位置，两个反斜杠 \\\\ 表示换行。适合多步推导。', 'display'],
    ['cases', '分段表达式', 'cases 分段函数 piecewise', raw`f(x)=\begin{cases}x,&x\ge 0\\-x,&x<0\end{cases}`, raw`|x|=\begin{cases}x,&x\ge0\\-x,&x<0\end{cases}`, 'cases 提供左大括号。& 后写条件，两个反斜杠分隔各行。', 'display'],
    ['fonts', '常用数学字体与文本', 'font mathbb mathrm text', raw`\mathbb{R},\quad\mathrm{d}x,\quad\text{当 }x>0`, raw`x\in\mathbb{R},\quad\text{且 }x\ne0`, '\\mathbb 表示黑板粗体，\\mathrm 表示正体，\\text 可在公式中插入文字。'],
  ],
  sets: [
    ['membership', '属于与不属于', '属于 元素属于 不属于 membership in notin', raw`a\in A,\quad b\notin A`, raw`2\in\{1,2,3\}`, '\\in 表示元素属于集合，\\notin 表示不属于。'],
    ['subset', '子集与真子集', '子集 真子集 subset subseteq subsetneq', raw`A\subseteq B,\quad A\subsetneq B`, raw`\{1\}\subsetneq\{1,2\}`, '\\subseteq 允许相等；\\subsetneq 明确表示真子集。'],
    ['intersection', '交集', 'intersection cap', raw`\cap`, raw`A\cap B=\{x\mid x\in A\text{ 且 }x\in B\}`, '交集由同时属于两个集合的元素组成，代码示例为 A \\cap B。'],
    ['union', '并集', 'union cup', raw`\cup`, raw`\{1,2\}\cup\{2,3\}=\{1,2,3\}`, '并集包括至少属于其中一个集合的元素。'],
    ['complement', '补集', 'complement complement_U', raw`\complement_U A`, raw`\complement_{\mathbb{R}}(0,+\infty)=(-\infty,0]`, '下标 U 指定全集。'],
    ['numbers', '空集与常用数集', 'emptyset varnothing 自然数 整数 有理数 实数 complex', raw`\varnothing,\quad\mathbb{N},\mathbb{Z},\mathbb{Q},\mathbb{R},\mathbb{C}`, raw`\mathbb{N}\subseteq\mathbb{Z}\subseteq\mathbb{Q}\subseteq\mathbb{R}`, '分别为空集、自然数、整数、有理数、实数、复数集。自然数是否含 0 依教材约定。'],
    ['quantifiers', '全称量词与存在量词', 'forall exists quantifier 任意 存在', raw`\forall x,\quad\exists x`, raw`\forall x\in\mathbb{R},\quad x^2\ge0`, '\\forall 表示任意，\\exists 表示存在。'],
    ['logic', '逻辑蕴含与等价', 'implies iff implication equivalent 充分 必要', raw`P\implies Q,\quad P\iff Q`, raw`x=1\implies x^2=1`, '单向箭头表示蕴含，双向箭头表示两个命题互相蕴含。'],
    ['set-builder', '集合描述法', 'set builder mid 描述法', raw`A=\{x\in\mathbb{R}\mid x>0\}`, raw`A=\{x\in\mathbb{Z}\mid -2\le x\le2\}`, '\\{ 和 \\} 显示花括号；\\mid 表示“满足”。'],
  ],
  equations: [
    ['equation', '方程与方程组', 'equation system equations 方程组', raw`\begin{cases}x+y=3\\x-y=1\end{cases}`, raw`\begin{cases}2x+y=5\\x-y=1\end{cases}`, '方程用等号直接书写；多方程可用 cases 并以两个反斜杠换行。', 'display'],
    ['inequality', '不等式与比较符号', 'inequality ge le neq 不等于 大于等于 小于等于', raw`a>b,\quad a<b,\quad a\ge b,\quad a\le b,\quad a\ne b`, raw`x^2\ge0,\quad x\ne0`, '\\ge 与 \\le 分别表示大于等于和小于等于，\\ne 表示不等于。'],
    ['absolute', '绝对值', 'absolute value lvert rvert', raw`\left|x\right|`, raw`|x-1|<2\iff -1<x<3`, '用竖线包围表达式；复杂内容可用 \\left| 和 \\right| 自动伸缩。'],
    ['quadratic', '一元二次方程求根公式', 'quadratic formula 求根 分式 根号', raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, raw`x^2-3x+2=0\implies x=\frac{3\pm\sqrt{1}}{2}`, '对于 ax²+bx+c=0，要求 a≠0；实数根还需判别式非负。'],
    ['discriminant', '判别式', 'discriminant Delta', raw`\Delta=b^2-4ac`, raw`\Delta=(-3)^2-4\cdot1\cdot2=1`, '大写希腊字母 \\Delta。对于实系数二次方程，Δ>0 时有两个不同实根。'],
  ],
  functions: [
    ['function', '函数与复合函数', 'function composition circ 函数表达式 函数复合', raw`y=f(x),\quad(f\circ g)(x)=f(g(x))`, raw`f(x)=x^2,\quad g(x)=x+1,\quad f(g(x))=(x+1)^2`, '\\circ 表示复合符号；复合函数要求内层值落在外层定义域内。'],
    ['domain', '定义域与值域', 'domain range 区间 infty', raw`f:D\to V,\quad x\in(0,+\infty)`, raw`f(x)=x^2,\quad D=\mathbb{R},\quad f(D)=[0,+\infty)`, '用 D 表示定义域、f(D) 表示实际值域；区间用括号和方括号书写，无穷端用圆括号。'],
    ['powers', '幂与指数', 'power exponent exponential exp', raw`x^{n},\quad a^x,\quad e^{kx}`, raw`2^{x+1}=2\cdot2^x`, '多字符指数必须放在 {} 内。'],
    ['logarithm', '对数', 'log ln logarithm', raw`\log_a x,\quad\ln x`, raw`\log_2 8=3,\quad\ln e=1`, '实对数要求真数大于 0，底数大于 0 且不等于 1。'],
    ['sequence', '数列通项与递推式', 'sequence recurrence 数列通项 递推', raw`a_n=a_1+(n-1)d,\quad a_{n+1}=a_n+d`, raw`a_1=2,\quad a_{n+1}=a_n+3,\quad a_n=3n-1`, '下标多字符时用 {}，如 a_{n+1}。递推式还需要初始条件。'],
    ['sum', '求和符号', 'summation sum sigma 求和', raw`\sum_{k=1}^{n}a_k`, raw`\sum_{k=1}^{n}k=\frac{n(n+1)}{2}`, '下标为求和起点，上标为终点，后面写通项。'],
    ['limit', '极限基础记号', 'limit lim to', raw`\lim_{x\to0}f(x)`, raw`\lim_{x\to0}\frac{\sin x}{x}=1`, '用 \\lim 和 \\to，示例中 x 按弧度计量。属于进阶预览。'],
    ['derivative', '导数基础记号', 'derivative prime 导数', raw`f'(x)=\frac{\mathrm{d}y}{\mathrm{d}x}`, raw`f(x)=x^2\implies f'(x)=2x`, '单引号表示一阶导数，也可用正体微分符号的分式。'],
  ],
  trigonometry: [
    ['trig', '正弦余弦正切', 'sine cosine tangent sin cos tan', raw`\sin x,\quad\cos x,\quad\tan x`, raw`\tan x=\frac{\sin x}{\cos x},\quad\cos x\ne0`, '使用带反斜杠的运算符，避免把 sin 排成三个相乘的字母。'],
    ['degrees', '角度与弧度', 'degree radian circ pi 度数 弧度', raw`180^\circ=\pi\,\mathrm{rad}`, raw`30^\circ=\frac{\pi}{6}\,\mathrm{rad}`, '^\\circ 是角度符号；弧度数常省略单位 rad。'],
    ['identity', '三角恒等式', 'trigonometric identity 恒等式', raw`\sin^2 x+\cos^2 x=1`, raw`\sin(\alpha+\beta)=\sin\alpha\cos\beta+\cos\alpha\sin\beta`, '\\sin^2 x 表示正弦值的平方。'],
    ['trig-params', '三角函数参数模板', 'amplitude phase omega varphi 振幅 周期', raw`y=A\sin(\omega x+\varphi)`, raw`y=2\sin\left(3x+\frac{\pi}{6}\right)`, 'A 表示振幅相关参数，ω 与周期相关，φ 为初相；A≠0、ω≠0 时周期为 2π/|ω|。'],
  ],
  geometry: [
    ['segments', '点线段与射线', 'point segment ray overline overrightarrow', raw`A,\quad\overline{AB},\quad\overrightarrow{AB}`, raw`\overline{AB},\quad AB=5`, '点用大写字母；上横线表示线段，上箭头可表示射线（也用于有向线段），应结合上下文说明。'],
    ['angle', '角与三角形', 'angle triangle 角 三角形', raw`\angle ABC,\quad\triangle ABC`, raw`\angle A+\angle B+\angle C=180^\circ`, '\\angle 后写角的字母，三字母记角时顶点在中间。'],
    ['parallel', '平行与垂直', 'parallel perpendicular perp 平行 垂直', raw`l\parallel m,\quad l\perp n`, raw`AB\parallel CD,\quad AB\perp BC`, '\\parallel 和 \\perp 分别表示平行与垂直。'],
    ['similar', '相似与全等', 'similar congruent sim cong', raw`\triangle ABC\sim\triangle DEF,\quad\triangle ABC\cong\triangle DEF`, raw`\triangle ABC\sim\triangle DEF\implies\frac{AB}{DE}=\frac{BC}{EF}`, '相似用 \\sim，全等用 \\cong；顶点顺序需要对应。'],
    ['area', '长度与面积', 'length area 面积 长度', raw`AB=a,\quad S_{\triangle ABC}=\frac{1}{2}ah`, raw`S_{\triangle ABC}=\frac{1}{2}ab\sin C`, '用普通字母 AB 表示长度；面积下标可写三角形名称。'],
  ],
  vectors: [
    ['vector', '向量与有向线段', 'vector vec overrightarrow 向量 有向线段', raw`\vec{a},\quad\overrightarrow{AB}`, raw`\overrightarrow{AB}+\overrightarrow{BC}=\overrightarrow{AC}`, '单字母向量用 \\vec，双字母有向线段用 \\overrightarrow。'],
    ['norm', '向量模', 'norm magnitude lVert rVert 模长', raw`\lVert\vec{a}\rVert`, raw`\vec{a}=(3,4)\implies\lVert\vec{a}\rVert=5`, '双竖线表示向量模；高中教材也常用单竖线。'],
    ['dot', '向量数量积与夹角', 'dot product angle cdot 数量积 夹角', raw`\vec{a}\cdot\vec{b}=|\vec{a}||\vec{b}|\cos\theta`, raw`\vec{a}\perp\vec{b}\implies\vec{a}\cdot\vec{b}=0`, '数量积用 \\cdot；非零向量夹角 θ 在 [0,π] 内。'],
    ['vector-coords', '向量坐标', 'vector coordinates 坐标向量', raw`\vec{a}=(a_1,a_2)`, raw`\vec{a}=(1,2),\quad\vec{b}=(3,4),\quad\vec{a}\cdot\vec{b}=11`, '坐标直接用括号和逗号书写。'],
  ],
  analytic: [
    ['line', '直线方程', 'line equation slope 斜截式 一般式', raw`y=kx+b,\quad Ax+By+C=0`, raw`2x-y+1=0`, '斜截式不包括竖直直线；一般式要求 A、B 不同时为零。'],
    ['circle', '圆的方程', 'circle equation', raw`(x-a)^2+(y-b)^2=r^2`, raw`(x-1)^2+(y+2)^2=9`, '圆心为 (a,b)，半径 r>0。'],
    ['point-distance', '点坐标与距离公式', 'point coordinates distance 距离', raw`P(x_1,y_1),\quad d=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}`, raw`A(0,0),\quad B(3,4),\quad AB=5`, '坐标下标区分两个点，距离使用平方和的平方根。'],
    ['ellipse', '椭圆标准方程', 'ellipse 椭圆', raw`\frac{x^2}{a^2}+\frac{y^2}{b^2}=1,\quad a>b>0`, raw`\frac{x^2}{9}+\frac{y^2}{4}=1`, '示例以 x 轴为长轴，焦半距满足 c²=a²-b²。'],
    ['hyperbola', '双曲线标准方程', 'hyperbola 双曲线', raw`\frac{x^2}{a^2}-\frac{y^2}{b^2}=1,\quad a,b>0`, raw`\frac{x^2}{4}-\frac{y^2}{5}=1`, '示例以 x 轴为实轴，焦半距满足 c²=a²+b²。'],
    ['parabola', '抛物线标准方程', 'parabola 抛物线', raw`y^2=2px,\quad p>0`, raw`y^2=4x`, '此形式向右开口；p 是焦点到准线的距离，焦点坐标为 (p/2,0)。'],
    ['parametric', '参数表示', 'parametric 参数方程', raw`\begin{cases}x=r\cos t\\y=r\sin t\end{cases}`, raw`\begin{cases}x=2\cos t\\y=2\sin t\end{cases}\quad0\le t<2\pi`, '用同一参数 t 表达两个坐标，例子表示以原点为圆心的圆。', 'display'],
  ],
  space: [
    ['space-points', '空间点直线与平面', 'space plane 空间点 平面', raw`P(x,y,z),\quad l\subset\alpha`, raw`P(1,2,3),\quad A\in\alpha`, '点用三维坐标，平面可用希腊字母表示。l⊂α 表示直线在平面内。'],
    ['space-vector', '空间向量与法向量', 'space vector normal 法向量', raw`\vec{n}=(A,B,C)`, raw`2x-y+3z=0,\quad\vec{n}=(2,-1,3)`, '平面 Ax+By+Cz+D=0 的一个法向量为 (A,B,C)，向量不能为零。'],
    ['space-relations', '空间平行垂直与夹角', '空间平行 空间垂直 normal angle', raw`l\perp\alpha,\quad\alpha\parallel\beta`, raw`\cos\theta=\frac{|\vec{n}_1\cdot\vec{n}_2|}{|\vec{n}_1||\vec{n}_2|}`, '两个平面的锐角或直角夹角可用非零法向量计算，θ∈[0,π/2]。'],
  ],
}

export const latexCatalog: FormulaEntry[] = categories.flatMap(([category]) =>
  rows[category].map(([id, name, aliases, latex, example, description, mode]) =>
    ({ id, category, name, aliases: aliases.split(' '), latex, example, description, mode })))
