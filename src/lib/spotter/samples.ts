export interface SamplePaper {
  id: string;
  title: string;
  field: string;
  kind: "human" | "ai" | "mixed";
  blurb: string;
  text: string;
}

export const SAMPLE_PAPERS: SamplePaper[] = [
  {
    id: "human-systems",
    title: "Failure modes of a rack-scale RDMA control plane",
    field: "Computer systems",
    kind: "human",
    blurb: "Methods excerpt with specific numbers, abandoned attempts, bursty sentences.",
    text: `We had intended to treat the control plane as a thin shim over libibverbs. That did not survive contact with the cluster. After three weeks of traces on the 128-node testbed (dual 100 GbE ConnectX-6, kernel 6.6.22, MLNX_OFED 24.04) the dominant stall was not queue-pair setup but a retry storm in our homemade subnet manager when a single leaf switch rebooted. The first design — a strongly consistent etcd lease per queue pair — collapsed at 40k QPs: lease refresh alone saturated the ToR. We abandoned it on 11 March and switched to a weakly ordered log with epoch fencing, closer to what FaSST did for RPCs, though we do not claim the same latency bound.

The surprising bit was not latency. It was who initiated reconnects. In 17 of 22 injected failures the client-side library raced the SM and installed a QP whose local rkey the remote had already retired. We only caught this because one graduate student left a fprintf in the completion path over a weekend; the logs are ugly and we have not cleaned them. Contra the “one-sided ops are simpler” folklore, the one-sided path required more fencing, not less (cf. Kalia et al. 2016, §4.2, and the errata they posted in 2019).

Limitations. We never ran at the full 2k-node production fabric; the largest stable run is 384 nodes, and even there the SM’s Python prototype was replaced mid-experiment by a rust rewrite whose CPU profile we still do not fully understand. Hyperparameters in Table 3 (retry budget 7, RTO 4 ms, epoch window 2^16) were picked by hand after the 40k-QP collapse. We failed to replicate the 3.1 µs median reported by ReThinkQP on our NICs; our best was 4.8 µs, and we suspect interrupt coalescing, not the protocol.`,
  },
  {
    id: "ai-related",
    title: "A comprehensive landscape of transformer reasoning",
    field: "NLP / related work",
    kind: "ai",
    blurb: "Generic related-work generated in the 2025–26 academic register.",
    text: `In recent years, large language models have garnered significant attention for their remarkable capabilities across a wide range of natural language processing tasks. Transformers, first introduced as a novel architecture, have played a pivotal role in this rapidly evolving landscape. It is important to note that a growing body of research has underscored the multifaceted nature of reasoning, shedding light on the intricate interplay between scale, data, and alignment.

This paper aims to provide a comprehensive overview of existing approaches. Furthermore, prior work has leveraged cutting-edge techniques to address this gap. Moreover, numerous studies have proposed robust frameworks that significantly enhance performance. Additionally, these methods pave the way for more holistic understanding. In the realm of academic writing, state-of-the-art systems utilize sophisticated pretraining objectives. Consequently, it is worth noting that to the best of our knowledge, no prior work has offered such a comprehensive tapestry of insights.

The remainder of this paper is organized as follows. We first delve into the background. We then present our novel methodology. Subsequently, we showcase experimental results. Finally, we discuss limitations at a high level and conclude. Not only does our approach improve accuracy, but it also facilitates broader applicability. This is a testament to the ever-evolving paradigm shift in artificial intelligence research. It is evident that the aforementioned contributions will inspire future work in this exciting area.`,
  },
  {
    id: "mixed-intro",
    title: "Hybrid dissertation introduction (vision + robotics)",
    field: "Robotics",
    kind: "mixed",
    blurb: "Human problem statement with an AI-polished contributions list.",
    text: `Indoor mobile manipulators still drop cups. That is the whole problem, dressed down. The lab’s Stretch RE2 will grasp a dry mug from a well-lit table and then, about one time in six, open the fingers two centimetres too early as it yaws toward the person. We instrumented 410 trials over four months; the early-open events cluster when the cup’s rim is within 8° of parallel to the wrist camera, which is exactly the pose waiters use. Existing grasp-stability papers (Mahler 2017, Sundermeyer 2021) assume the object is the goal. Here the object is a temporary tool. That distinction is not semantic fluff — it changes which visual features are allowed to vanish during transport.

In recent years, vision-language-action models have garnered significant attention and have played a crucial role in the rapidly evolving robotics landscape. This thesis aims to provide a comprehensive framework. Furthermore, we leverage a novel end-to-end architecture that significantly enhances robustness. Moreover, our holistic approach paves the way for more general-purpose manipulation. The remainder of this paper is organized as follows.

What we actually did: we froze the vision backbone after week two because finetuning it on our 410 trials wrecked table-top performance, and we never got it back. Chapter 4 is the ugly ablation. Chapter 5 is the only part I would defend in a job talk.`,
  },
  {
    id: "human-theory",
    title: "A note on spectral gaps for a non-reversible walk",
    field: "Probability",
    kind: "human",
    blurb: "Proof-sketch voice, notation, and an admitted hole.",
    text: `Let P be the transition kernel of the non-reversible walk on Z^d / nZ^d constructed in §2. Write λ2 for the eigenvalue of largest real part strictly less than 1. The claim in the extended abstract — that 1−Re λ2 ≍ n^{−2} uniformly in the drift — is false as stated. Counter-example: take d=1, n=p prime, and drift ε = n^{−1/2}. Then the tilted generator has an additional imaginary component of order n^{−1/2}, and the real gap collapses to Θ(n^{−3}) in numerical checks up to n=257. I do not have a proof of the n^{−3} scaling, only the pictures in Figure 2 and a formal perturbation that I cannot justify past the first two terms (the remainder involves a resolvent I do not control).

What remains true is Proposition 3.4: if the drift is O(n^{−1}) then the gap is comparable to the reversible case, with implied constant depending on the Lipschitz constant of the conductance, not on n. The argument is the usual Dirichlet-form comparison plus a sector condition in the sense of Saloff-Coste; see Lemma 3.6. I am unhappy with the dependence on the sector angle — it explodes as the walk approaches a pure rotation — and I do not see how to remove it. An earlier version claimed a log n bound; that proof had a missing factor in (3.12) which E. C. pointed out.

Notation. We write a ≲ b for inequality up to a constant depending only on d and the conductance modulus. O(·) is never uniform in ε unless said.`,
  },
  {
    id: "ai-litreview",
    title: "Literature review: foundation models for science",
    field: "Computational science",
    kind: "ai",
    blurb: "Even paragraphs, stacked transitions, no specific venue fights.",
    text: `Scientific discovery is undergoing a paradigm shift as foundation models are increasingly leveraged to tackle complex research questions. It is important to note that these models offer a robust framework for integrating multimodal data sources, thereby facilitating more holistic analyses. In the realm of biology, chemistry, and climate science, a growing body of work has underscored the pivotal role of large-scale pretraining.

Furthermore, existing approaches have demonstrated remarkable performance across a wide range of benchmarks. Moreover, researchers have proposed novel architectures that significantly enhance generalization. Additionally, these contributions pave the way for groundbreaking applications. To the best of our knowledge, this comprehensive overview is the first to delve into the intricate interplay among data curation, alignment, and evaluation. Consequently, it is worth noting that future work should explore more nuanced methodologies.

In conclusion, foundation models represent a testament to the ever-evolving landscape of artificial intelligence. Not only do they showcase impressive capabilities, but they also address this gap in the literature. We hope this paper inspires further research in this exciting and rapidly evolving field.`,
  },
];
