/**
 * The junior participant waiver, word for word from the paper form
 * (Foundry_Padel_Junior_Waiver.pdf, the one the desk hands out). One copy, read by
 * both ends: /juniors/waiver renders it for the parent to read before accepting, and
 * server/juniors-waiver.js lays it into the PDF that is filed and emailed once they
 * have. Edit the paper form and this together; a parent must accept the same words
 * online as on paper.
 */

export const WAIVER_TITLE = "Junior Participant Waiver";
export const WAIVER_SUBTITLE = "Release of Liability and Parental Consent";

/** The box at the top of page 1. */
export const WAIVER_NOTICE =
  "Read carefully before signing. This is a legal document. It affects your legal rights and those of your child, " +
  "including the right to sue. Players under 18 may not take part in any Foundry Padel program until a parent or " +
  "legal guardian has signed it.";

export const WAIVER_PREAMBLE = [
  "This Junior Participant Waiver, Release of Liability and Parental Consent (\"Agreement\") is entered into between " +
    "the undersigned parent or legal guardian (\"Parent/Guardian\"), on their own behalf and on behalf of the minor " +
    "named below (\"Participant\"), and Foundry Padel, including its owners, operators, employees, coaches, " +
    "contractors, volunteers, directors, officers, sponsors, and agents (collectively, \"Foundry Padel\").",
  "In this Agreement, \"I\" and \"my\" refer to the Parent/Guardian, and \"my child\" refers to the Participant. By signing, I " +
    "confirm that I am the parent or legal guardian of the Participant with full legal authority to sign this Agreement on " +
    "their behalf.",
];

/**
 * Sections 5 to 17: the terms. Sections 1 to 4 are the fill-in blocks (participant,
 * contacts, medical, pickup) and live in the form itself. A `bullets` entry is the
 * list in section 7; everything else is paragraphs. Section 11's two boxes are the
 * media-consent choice the form asks per child.
 */
export const WAIVER_SECTIONS = [
  {
    n: 5,
    heading: "Assumption of Risk",
    paras: [
      "I understand that participation in padel and other recreational or athletic activities at Foundry Padel involves " +
        "inherent risks, including but not limited to physical exertion, contact with balls, rackets, glass walls, fencing, or " +
        "other players, collisions, falls, equipment failure, and conditions related to the facility and environment such as " +
        "playing surfaces, lighting, and temperature.",
      "These risks can cause injury, including: (1) minor injuries such as scratches, bruises, sprains, blisters, and finger " +
        "or nail injuries; (2) serious injuries such as fractures, ligament injuries, eye injuries, joint or back injuries, heat " +
        "illness, and concussions; and (3) catastrophic injuries, including paralysis and death. I understand that children " +
        "may be less able than adults to recognize and avoid hazards.",
      "Knowing these risks, I voluntarily allow my child to participate, and on behalf of myself and my child I assume all " +
        "such risks. I acknowledge that Foundry Padel has made no guarantees regarding the safety of the facilities, " +
        "equipment, or activities.",
    ],
  },
  {
    n: 6,
    heading: "Waiver and Release of Liability",
    paras: [
      "In consideration of my child being permitted to participate in activities at Foundry Padel, I, on behalf of myself, my " +
        "child, and our heirs, assigns, and personal representatives, release, waive, discharge, and agree not to sue " +
        "Foundry Padel for any and all claims, demands, damages, losses, or liabilities of any kind arising out of or related " +
        "to my child's participation, including claims arising from the ordinary negligence of Foundry Padel, to the fullest " +
        "extent permitted by Oregon law.",
      "This release applies to claims that are known or unknown, foreseen or unforeseen, arising now or in the future. It " +
        "does not apply to claims arising from gross negligence, recklessness, or intentional misconduct.",
    ],
  },
  {
    n: 7,
    heading: "Supervision",
    paras: [],
    bullets: [
      "During scheduled sessions: Foundry Padel coaches and staff supervise participants during the scheduled " +
        "session time only.",
      "Before and after sessions: I am responsible for my child's supervision before the session begins and after it " +
        "ends, including in the lobby, parking lot, and other common areas. Children should not be dropped off more " +
        "than 15 minutes before a session starts.",
      "Pickup: I will pick up my child, or arrange for an authorized adult to do so, promptly at the end of each " +
        "session. Foundry Padel may contact me or my emergency contacts if my child has not been picked up.",
      "Outside of programs: When my child is at Foundry Padel outside of a coached program, including open " +
        "play, court bookings, and events, I or another responsible adult will supervise my child at all times. Children " +
        "may not be left unattended.",
    ],
  },
  {
    n: 8,
    heading: "Medical Authorization and Financial Responsibility",
    paras: [
      "In the event of injury, illness, or medical emergency, I authorize Foundry Padel staff to administer basic first aid " +
        "and to obtain or arrange emergency medical treatment and transportation for my child if I cannot be reached " +
        "promptly. Foundry Padel will make reasonable efforts to contact me or my emergency contacts as soon as " +
        "possible.",
      "I am solely responsible for all medical expenses resulting from my child's participation, including emergency care, " +
        "transportation, evaluation, and treatment. Foundry Padel assumes no responsibility for any injury or damage " +
        "arising from such treatment.",
    ],
  },
  {
    n: 9,
    heading: "Health, Fitness and Pre-Existing Conditions",
    paras: [
      "I certify that my child is in good physical condition and able to safely participate in athletic activities, and that I " +
        "have consulted a medical professional if I have any concern about my child's ability to participate. I have " +
        "disclosed above any condition, injury, allergy, or medication coaches should know about, and I will update " +
        "Foundry Padel if anything changes.",
      "I understand that Foundry Padel does not provide medical or health insurance coverage for participants. I will not " +
        "send my child to participate if they are ill, showing symptoms of a communicable disease, or have been advised " +
        "to isolate.",
      "If my child shows signs of a possible head injury or concussion, I understand that staff will remove my child from " +
        "play and that my child may not return to activity that day. I will follow medical advice before my child returns to " +
        "play.",
    ],
  },
  {
    n: 10,
    heading: "Rules, Conduct and Equipment",
    paras: [
      "My child will follow all posted rules, safety guidelines, and instructions from coaches and staff, wear appropriate " +
        "athletic attire and non-marking court shoes, and use equipment only as intended. Protective eyewear is " +
        "recommended for junior players.",
      "Harassment, bullying, discrimination, verbal or physical abuse, intimidation, threats, or any unsafe or disruptive " +
        "behavior will not be tolerated. Foundry Padel may, at its sole discretion, remove my child from a session or " +
        "program, or deny future participation, for safety reasons or misconduct, without refund. I will be contacted to pick " +
        "up my child if they are removed from a session.",
    ],
  },
  {
    n: 11,
    heading: "Image, Video and Media Consent",
    paras: [
      "Foundry Padel may photograph or record activities, including through court camera systems, for coaching, " +
        "promotional, marketing, and informational purposes. Foundry Padel will not publish my child's full name alongside " +
        "their image without my further permission. Please choose one:",
    ],
  },
  {
    n: 12,
    heading: "Indemnification",
    paras: [
      "To the fullest extent permitted by law, I agree to indemnify, defend, and hold harmless Foundry Padel from any " +
        "claims, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or related to my " +
        "child's participation, including any claim brought by or on behalf of my child.",
    ],
  },
  {
    n: 13,
    heading: "Personal Property",
    paras: [
      "Foundry Padel is not responsible for lost, stolen, or damaged personal property brought onto the premises by me " +
        "or my child.",
    ],
  },
  {
    n: 14,
    heading: "Third-Party Activities and Contractors",
    paras: [
      "Some instruction, events, or services may be provided by independent contractors or third parties. To the fullest " +
        "extent permitted by law, Foundry Padel is not responsible for the acts or omissions of such third parties.",
    ],
  },
  {
    n: 15,
    heading: "Duration of Agreement",
    paras: [
      "This Agreement applies to my child's current participation and to all future visits, programs, and activities at " +
        "Foundry Padel until my child turns 18 or until I revoke it in writing, whichever comes first. Once my child turns 18, " +
        "they must sign the adult participant waiver.",
    ],
  },
  {
    n: 16,
    heading: "Severability",
    paras: [
      "This Agreement is intended to be as broad and inclusive as permitted by Oregon law. If any part of it is held " +
        "invalid or unenforceable, the remaining provisions will remain in full force and effect.",
    ],
  },
  {
    n: 17,
    heading: "Governing Law and Venue",
    paras: [
      "This Agreement is governed by the laws of the State of Oregon. Any dispute arising from this Agreement or my " +
        "child's participation will be brought in the state or federal courts located in Multnomah County, Oregon.",
    ],
  },
];

/** The two boxes under section 11, in the form's order. `value` is what the form sends. */
export const MEDIA_CHOICES = [
  { value: "yes", label: "I GIVE permission for my child's image, likeness, and voice to be used for these purposes without compensation." },
  { value: "no", label: "I DO NOT give permission for my child's image to be used in promotional or marketing materials." },
];

/** The 14+ box under section 4. */
export const LEAVE_ALONE_LABEL = "My child may leave Foundry Padel on their own at the end of the session.";

export const PICKUP_INTRO =
  "My child may be released at the end of a session only to me or to the adults listed below. Staff may ask for photo ID.";

export const MEDICAL_INTRO =
  "Please list anything coaches and staff should know to keep your child safe. Write \"None\" if not applicable.";

/** The capitals block above the signature. */
export const PARENT_ACK =
  "I HAVE READ THIS AGREEMENT, FULLY UNDERSTAND ITS TERMS, AND UNDERSTAND THAT I AM GIVING UP SUBSTANTIAL " +
  "RIGHTS FOR MYSELF AND MY CHILD, INCLUDING THE RIGHT TO SUE. I SIGN IT FREELY AND VOLUNTARILY AND CONFIRM " +
  "THAT I AM THE PARENT OR LEGAL GUARDIAN OF THE PARTICIPANT WITH AUTHORITY TO SIGN ON THEIR BEHALF.";
export const PARENT_ACK_LINE = "By signing below, or by electronic acceptance, I agree to all terms of this Agreement.";

export const PARTICIPANT_ACK_HEADING = "Participant Acknowledgment (recommended for participants age 10 and older)";
export const PARTICIPANT_ACK =
  "I have gone over the rules and safety guidelines with my parent or guardian. I agree to listen to my coaches, " +
  "follow the rules, play safely, and treat everyone with respect.";
