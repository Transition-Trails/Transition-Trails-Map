/* @ds-bundle: {"format":4,"namespace":"TransitionTrailsDesignSystem_335df4","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Card","sourcePath":"components/content/Card.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Alert","sourcePath":"components/status/Alert.jsx"},{"name":"Pill","sourcePath":"components/status/Pill.jsx"},{"name":"Stepper","sourcePath":"components/status/Stepper.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"e034c45c89a7","components/content/Card.jsx":"a1d8d8ee5bc8","components/forms/Input.jsx":"7cf8422799d7","components/status/Alert.jsx":"3e2866600f11","components/status/Pill.jsx":"020bdfab7e54","components/status/Stepper.jsx":"7ebc989ce7a7","ui_kits/portal/Dashboard.jsx":"cf37c9d4b864","ui_kits/portal/PortalChrome.jsx":"84491549a6b1","ui_kits/portal/Program.jsx":"71352202e0ca","ui_kits/website/GetInvolved.jsx":"7dc13cbb9b42","ui_kits/website/Home.jsx":"6a070b676e92","ui_kits/website/Programs.jsx":"7b61e0cfd107","ui_kits/website/SiteChrome.jsx":"942d17e06216"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TransitionTrailsDesignSystem_335df4 = window.TransitionTrailsDesignSystem_335df4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: '9px 18px',
    fontSize: '13px'
  },
  md: {
    padding: '13px 26px',
    fontSize: '15px'
  },
  lg: {
    padding: '16px 34px',
    fontSize: '17px'
  }
};

/**
 * Transition Trails button. Primary = Trail Green. Secondary = teal outline.
 * Amber = the single "Next Step" CTA per screen (use at most one). Ghost = text link.
 */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  children,
  style,
  ...rest
}) {
  const base = {
    fontFamily: "var(--tt-font-heading)",
    fontWeight: 600,
    borderRadius: 'var(--tt-radius-md)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    lineHeight: 1.1,
    transition: 'background .15s ease, color .15s ease, box-shadow .15s ease',
    ...(SIZES[size] || SIZES.md)
  };
  const variants = {
    primary: {
      background: 'var(--tt-trail-green)',
      color: '#fff'
    },
    secondary: {
      background: '#fff',
      color: 'var(--tt-deep-teal)',
      border: '1.5px solid var(--tt-deep-teal)'
    },
    amber: {
      background: 'var(--tt-sun-amber)',
      color: 'var(--tt-charcoal)',
      boxShadow: 'var(--tt-shadow-amber)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--tt-trail-green)',
      padding: `${SIZES[size].padding.split(' ')[0]} 8px`
    }
  };
  const disabledStyle = disabled ? {
    background: 'var(--tt-warm-gray)',
    color: '#9AA09D',
    boxShadow: 'none',
    border: 'none'
  } : null;
  const [hover, setHover] = React.useState(false);
  const hoverStyle = !disabled && hover ? {
    primary: {
      background: 'var(--tt-green-700)'
    },
    secondary: {
      background: 'var(--tt-sky-100)'
    },
    amber: {
      background: 'var(--tt-amber-700)',
      color: '#fff'
    },
    ghost: {
      color: 'var(--tt-green-700)'
    }
  }[variant] : null;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...variants[variant],
      ...hoverStyle,
      ...disabledStyle,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/content/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Transition Trails content card. Optional media header (photo/illustration or
 * soft green-tint placeholder), Poppins title, supportive body, optional footer.
 * Lifts gently on hover.
 */
function Card({
  title,
  children,
  media,
  mediaSrc,
  footer,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: 'var(--tt-surface)',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      overflow: 'hidden',
      maxWidth: '320px',
      cursor: onClick ? 'pointer' : 'default',
      transform: hover ? 'translateY(-3px)' : 'none',
      boxShadow: hover ? 'var(--tt-shadow-card)' : 'none',
      transition: 'transform .15s ease, box-shadow .15s ease',
      ...style
    }
  }, rest), (media || mediaSrc) && /*#__PURE__*/React.createElement("div", {
    style: {
      height: '140px',
      background: mediaSrc ? `center/cover no-repeat url("${mediaSrc}")` : 'linear-gradient(135deg, var(--tt-green-100), var(--tt-green-300))'
    }
  }, !mediaSrc && media), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px'
    }
  }, title && /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: 'var(--tt-h4)',
      color: 'var(--tt-heading)',
      margin: '0 0 8px'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-body)',
      fontSize: 'var(--tt-body-sm)',
      lineHeight: 1.6,
      color: 'var(--tt-text)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '16px'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Card.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Transition Trails text input with label and optional help/error message.
 * Green focus ring; errors pair Amber-700 text with a ⚠ glyph (never color alone).
 */
function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  help,
  error,
  disabled = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const borderColor = error ? 'var(--tt-amber-700)' : focus ? 'var(--tt-trail-green)' : 'var(--tt-border)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-body)',
      maxWidth: '360px',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'block',
      fontWeight: 600,
      fontSize: '13.5px',
      color: 'var(--tt-heading)',
      marginBottom: '6px'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      fontFamily: 'var(--tt-font-body)',
      fontSize: '15px',
      color: 'var(--tt-heading)',
      padding: '11px 14px',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--tt-radius-md)',
      outline: 'none',
      background: disabled ? 'var(--tt-trail-light)' : '#fff',
      boxShadow: focus && !error ? 'var(--tt-focus-ring)' : 'none',
      transition: 'border-color .15s, box-shadow .15s',
      boxSizing: 'border-box'
    }
  }, rest)), error ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      fontSize: '12.5px',
      color: 'var(--tt-amber-700)',
      marginTop: '6px',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26A0"), /*#__PURE__*/React.createElement("span", null, error)) : help ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: '#7A807D',
      marginTop: '6px'
    }
  }, help) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/status/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  success: {
    bg: 'var(--tt-green-100)',
    border: 'var(--tt-green-300)',
    glyph: '✓'
  },
  info: {
    bg: 'var(--tt-sky-100)',
    border: 'var(--tt-sky-blue)',
    glyph: 'ⓘ'
  },
  warning: {
    bg: 'var(--tt-amber-100)',
    border: 'var(--tt-amber-300)',
    glyph: '⚠'
  },
  neutral: {
    bg: 'var(--tt-trail-light)',
    border: 'var(--tt-warm-gray)',
    glyph: 'ⓘ'
  }
};

/**
 * Transition Trails inline alert / callout. Always pairs an icon glyph with the
 * message so meaning is never carried by color alone.
 */
function Alert({
  tone = 'info',
  title,
  children,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      gap: '12px',
      padding: '16px 18px',
      borderRadius: 'var(--tt-radius-md)',
      background: t.bg,
      border: `1px solid ${t.border}`,
      fontFamily: 'var(--tt-font-body)',
      fontSize: '13.5px',
      lineHeight: 1.5,
      color: 'var(--tt-heading)',
      maxWidth: '460px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: '16px',
      lineHeight: 1.4
    }
  }, t.glyph), /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600
    }
  }, title), title && ' — ', children));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/Alert.jsx", error: String((e && e.message) || e) }); }

// components/status/Pill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  green: {
    background: 'var(--tt-green-100)',
    color: 'var(--tt-green-700)'
  },
  teal: {
    background: 'var(--tt-sky-100)',
    color: 'var(--tt-deep-teal)'
  },
  amber: {
    background: 'var(--tt-amber-100)',
    color: 'var(--tt-amber-700)'
  },
  gray: {
    background: 'var(--tt-warm-gray)',
    color: 'var(--tt-slate)'
  }
};

/**
 * Transition Trails status/category pill. Use for trail types and status labels.
 */
function Pill({
  tone = 'green',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 500,
      fontSize: '13px',
      padding: '6px 14px',
      borderRadius: 'var(--tt-radius-pill)',
      lineHeight: 1.2,
      ...(TONES[tone] || TONES.green),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/Pill.jsx", error: String((e && e.message) || e) }); }

// components/status/Stepper.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Transition Trails progress stepper. Shows steps along a trail; the current step
 * is marked in Sun Amber, completed steps in Trail Green, upcoming in Warm Gray.
 * steps: array of strings (labels) or { label } objects. current: 0-based index.
 */
function Stepper({
  steps = [],
  current = 0,
  style,
  ...rest
}) {
  const items = steps.map(s => typeof s === 'string' ? {
    label: s
  } : s);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      fontFamily: 'var(--tt-font-body)',
      ...style
    }
  }, rest), items.map((step, i) => {
    const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
    const dot = {
      done: {
        background: 'var(--tt-trail-green)',
        color: '#fff',
        border: 'none'
      },
      current: {
        background: 'var(--tt-sun-amber)',
        color: 'var(--tt-charcoal)',
        border: 'none'
      },
      upcoming: {
        background: '#fff',
        color: '#9AA09D',
        border: '1.5px solid var(--tt-warm-gray)'
      }
    }[state];
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        minWidth: '84px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '32px',
        height: '32px',
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--tt-font-heading)',
        fontWeight: 600,
        fontSize: '14px',
        ...dot
      }
    }, state === 'done' ? '✓' : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13px',
        textAlign: 'center',
        lineHeight: 1.3,
        color: state === 'upcoming' ? '#9AA09D' : 'var(--tt-heading)',
        fontWeight: state === 'current' ? 600 : 400
      }
    }, step.label)), i < items.length - 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: '2px',
        marginTop: '15px',
        minWidth: '24px',
        background: i < current ? 'var(--tt-trail-green)' : 'var(--tt-warm-gray)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { Stepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/Stepper.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/Dashboard.jsx
try { (() => {
/* Transition Trails — learner portal Dashboard. */
const {
  Button,
  Card,
  Pill,
  Alert,
  Stepper
} = window.TransitionTrailsDesignSystem_335df4;
function Dashboard({
  onNav
}) {
  const {
    PIcon
  } = window.TT_Portal;
  const tasks = [['Submit project scope doc', 'Due Fri', 'amber'], ['Mentor check-in — Priya', 'Tomorrow 2pm', 'teal'], ['Complete accessibility module', 'This week', 'gray']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 36px',
      fontFamily: 'var(--tt-font-body)',
      color: 'var(--tt-text)',
      flex: 1,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '30px',
      color: 'var(--tt-heading)',
      margin: '0 0 4px'
    }
  }, "Welcome back, Jordan."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '15px'
    }
  }, "You're on the ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--tt-heading)'
    }
  }, "Guided Trail"), " \u2014 keep the momentum going.")), /*#__PURE__*/React.createElement(Button, {
    variant: "amber",
    onClick: () => onNav('program')
  }, "Log project hours \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '26px 28px',
      margin: '24px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '22px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '19px',
      color: 'var(--tt-heading)',
      margin: 0
    }
  }, "Your trail progress"), /*#__PURE__*/React.createElement(Pill, {
    tone: "green"
  }, "Stage 3 of 5")), /*#__PURE__*/React.createElement(Stepper, {
    steps: ['Apply', 'Onboard', 'Project Work', 'Validation', 'Graduate'],
    current: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '24px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '17px',
      color: 'var(--tt-heading)',
      margin: '0 0 16px'
    }
  }, "Next milestones"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, tasks.map(([t, due, tone]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '13px 16px',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-md)'
    }
  }, /*#__PURE__*/React.createElement(PIcon, {
    name: "circle",
    size: 18,
    color: "var(--tt-warm-gray)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: '14.5px',
      color: 'var(--tt-heading)'
    }
  }, t), /*#__PURE__*/React.createElement(Pill, {
    tone: tone
  }, due))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    title: "Mentor note"
  }, "Priya left feedback on your data model. Review before Friday's check-in."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--tt-green-100)',
      border: '1px solid var(--tt-green-300)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '32px',
      color: 'var(--tt-green-700)'
    }
  }, "68 hrs"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      color: 'var(--tt-slate)',
      marginBottom: '14px'
    }
  }, "Supervised experience logged"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => onNav('program')
  }, "View my trail")))));
}
Object.assign(window, {
  TT_Dashboard: Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/PortalChrome.jsx
try { (() => {
/* Transition Trails — learner portal shared chrome (Experience Cloud style).
   Teal top bar + left sidebar. Exports to window.TT_Portal. */
const {
  useEffect,
  useRef
} = React;
function PIcon({
  name,
  size = 20,
  color = 'currentColor'
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          stroke: color,
          'stroke-width': 1.9
        }
      });
    }
  }, [name, size, color]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: 'inline-flex',
      lineHeight: 0
    }
  });
}
function TopBar() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: '58px',
      background: 'var(--tt-deep-teal)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: 'var(--tt-font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '17px',
      color: '#fff'
    }
  }, "Transition Trails"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--tt-sky-blue)',
      borderLeft: '1px solid rgba(255,255,255,.25)',
      paddingLeft: '14px'
    }
  }, "Learner Portal")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      color: 'rgba(255,255,255,.9)'
    }
  }, /*#__PURE__*/React.createElement(PIcon, {
    name: "search",
    size: 18
  }), /*#__PURE__*/React.createElement(PIcon, {
    name: "bell",
    size: 18
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '30px',
      height: '30px',
      borderRadius: '999px',
      background: 'var(--tt-sun-amber)',
      color: 'var(--tt-charcoal)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '13px'
    }
  }, "JR"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#fff'
    }
  }, "Jordan R."))));
}
function Sidebar({
  current,
  onNav
}) {
  const items = [['dashboard', 'Dashboard', 'layout-dashboard'], ['program', 'My Trail', 'route'], ['projects', 'Projects', 'folder-kanban'], ['mentors', 'Mentors', 'users'], ['resources', 'Resources', 'book-open']];
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width: '224px',
      background: '#fff',
      borderRight: '1px solid var(--tt-border)',
      padding: '20px 14px',
      fontFamily: 'var(--tt-font-body)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }
  }, items.map(([id, label, icon]) => {
    const active = current === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onNav(id === 'program' ? 'program' : 'dashboard'),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '11px 14px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 'var(--tt-radius-md)',
        background: active ? 'var(--tt-green-100)' : 'transparent',
        color: active ? 'var(--tt-green-700)' : 'var(--tt-slate)',
        fontWeight: active ? 600 : 400,
        fontSize: '14.5px'
      }
    }, /*#__PURE__*/React.createElement(PIcon, {
      name: icon,
      size: 19,
      color: active ? 'var(--tt-trail-green)' : 'var(--tt-slate)'
    }), label);
  })));
}
Object.assign(window, {
  TT_Portal: {
    PIcon,
    TopBar,
    Sidebar
  }
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/PortalChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/Program.jsx
try { (() => {
/* Transition Trails — learner portal Program (My Trail) detail. */
const {
  Button,
  Card,
  Pill,
  Alert,
  Stepper
} = window.TransitionTrailsDesignSystem_335df4;
function Program({
  onNav
}) {
  const {
    PIcon
  } = window.TT_Portal;
  const modules = [['Discovery & scoping', 'done', 'Define the partner problem and success criteria.'], ['Data model & build', 'current', 'Configure objects, flows, and dashboards with mentor review.'], ['User testing', 'upcoming', 'Validate with the partner and iterate.'], ['Handoff & documentation', 'upcoming', 'Deliver a documented, maintainable solution.']];
  const dot = {
    done: {
      background: 'var(--tt-trail-green)',
      color: '#fff',
      glyph: 'check'
    },
    current: {
      background: 'var(--tt-sun-amber)',
      color: 'var(--tt-charcoal)',
      glyph: 'dot'
    },
    upcoming: {
      background: '#fff',
      color: '#9AA09D',
      glyph: 'dot'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 36px',
      fontFamily: 'var(--tt-font-body)',
      color: 'var(--tt-text)',
      flex: 1,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('dashboard'),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--tt-link)',
      fontSize: '14px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: 0,
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement(PIcon, {
    name: "arrow-left",
    size: 16,
    color: "var(--tt-trail-green)"
  }), " Back to dashboard"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px',
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "green"
  }, "Guided Trail"), /*#__PURE__*/React.createElement(Pill, {
    tone: "teal"
  }, "Partner: Riverside Food Bank")), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '30px',
      color: 'var(--tt-heading)',
      margin: '0 0 20px'
    }
  }, "Volunteer intake redesign"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '26px 28px',
      marginBottom: '24px'
    }
  }, /*#__PURE__*/React.createElement(Stepper, {
    steps: ['Apply', 'Onboard', 'Project Work', 'Validation', 'Graduate'],
    current: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '20px',
      color: 'var(--tt-heading)',
      margin: '0 0 16px'
    }
  }, "Project modules"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, modules.map(([t, state, desc]) => {
    const d = dot[state];
    return /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: 'flex',
        gap: '16px',
        background: '#fff',
        border: '1px solid var(--tt-border)',
        borderRadius: 'var(--tt-radius-md)',
        padding: '18px 20px',
        boxShadow: state === 'current' ? 'var(--tt-shadow-amber)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '30px',
        height: '30px',
        borderRadius: '999px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: state === 'upcoming' ? '1.5px solid var(--tt-warm-gray)' : 'none',
        background: d.background,
        color: d.color
      }
    }, d.glyph === 'check' ? /*#__PURE__*/React.createElement(PIcon, {
      name: "check",
      size: 16,
      color: "#fff"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        width: '7px',
        height: '7px',
        borderRadius: '999px',
        background: d.color,
        display: 'block'
      }
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("h4", {
      style: {
        fontFamily: 'var(--tt-font-heading)',
        fontWeight: 600,
        fontSize: '16px',
        color: 'var(--tt-heading)',
        margin: 0
      }
    }, t), state === 'current' && /*#__PURE__*/React.createElement(Pill, {
      tone: "amber"
    }, "In progress")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '5px 0 0',
        fontSize: '14px',
        lineHeight: 1.5
      }
    }, desc)));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '22px'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '16px',
      color: 'var(--tt-heading)',
      margin: '0 0 14px'
    }
  }, "Your mentor"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '44px',
      height: '44px',
      borderRadius: '999px',
      background: 'var(--tt-deep-teal)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600
    }
  }, "PA"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--tt-heading)',
      fontSize: '15px'
    }
  }, "Priya A."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px'
    }
  }, "Salesforce Architect \xB7 9 yrs"))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    style: {
      width: '100%',
      justifyContent: 'center'
    }
  }, "Message mentor")), /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    title: "On track"
  }, "You've logged 68 of 80 required project hours."), /*#__PURE__*/React.createElement(Button, {
    variant: "amber",
    onClick: () => onNav('dashboard'),
    style: {
      justifyContent: 'center'
    }
  }, "Log today's hours \u2192"))));
}
Object.assign(window, {
  TT_Program: Program
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/Program.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/GetInvolved.jsx
try { (() => {
/* Transition Trails — website Get Involved / apply screen with a working form. */
const {
  Button,
  Card,
  Pill,
  Alert,
  Input
} = window.TransitionTrailsDesignSystem_335df4;
const {
  useState
} = React;
function GetInvolved() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setErr('Please enter your name.');
      return;
    }
    setErr('');
    setSent(true);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-body)',
      color: 'var(--tt-text)'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--tt-trail-green)',
      padding: '56px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--tt-font-accent)',
      fontWeight: 600,
      fontSize: '28px',
      color: 'var(--tt-amber-300)'
    }
  }, "start your journey today"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '40px',
      color: '#fff',
      margin: '8px 0 12px'
    }
  }, "Take the next step."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '17px',
      color: 'rgba(255,255,255,.86)',
      maxWidth: '620px',
      margin: 0,
      lineHeight: 1.6
    }
  }, "Apply to a trail, volunteer as a mentor, or partner your nonprofit. Tell us where you are \u2014 we'll help you find the path."))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '48px 40px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '40px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '26px',
      color: 'var(--tt-heading)',
      margin: '0 0 20px'
    }
  }, "Three ways to walk with us"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, [['Learn', 'green', 'Apply to a trail and build verifiable experience.'], ['Mentor', 'teal', 'Volunteer 2–3 hours a week to guide a learner.'], ['Partner', 'gray', 'Host a supervised project at your nonprofit.']].map(([t, tone, b]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-md)',
      padding: '18px 20px'
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: tone
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      fontSize: '15px',
      lineHeight: 1.5
    }
  }, b))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '32px',
      boxShadow: 'var(--tt-shadow-soft)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '22px',
      color: 'var(--tt-heading)',
      margin: '0 0 6px'
    }
  }, "Start your application"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 22px',
      fontSize: '14px'
    }
  }, "It takes about two minutes. No commitment yet."), sent ? /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    title: "Application received"
  }, "Welcome to the trail, ", name || 'friend', "! We'll be in touch within two business days.") : /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Full name",
    value: name,
    onChange: e => setName(e.target.value),
    error: err,
    style: {
      maxWidth: 'none'
    }
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email address",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "you@example.com",
    help: "We'll only use this to send trail updates.",
    style: {
      maxWidth: 'none'
    }
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Which trail interests you?",
    placeholder: "Foundations / Guided / Not sure yet",
    style: {
      maxWidth: 'none'
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "amber",
    size: "lg",
    type: "submit"
  }, "Take the Next Step \u2192")))));
}
Object.assign(window, {
  TT_GetInvolved: GetInvolved
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/GetInvolved.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
/* Transition Trails — website Home screen. Uses window.TransitionTrailsDesignSystem_335df4 + TT_Site. */
const {
  Button,
  Card,
  Pill,
  Stepper
} = window.TransitionTrailsDesignSystem_335df4;
function Home({
  onNav
}) {
  const {
    Icon
  } = window.TT_Site;
  const stats = [['180+', 'Learners guided'], ['42', 'Nonprofit partners'], ['91%', 'Placed within 6 months']];
  const programs = [['Foundations Trail', 'teal', 'Post-certification fundamentals — turn what you learned into supervised, real-world practice.'], ['Guided Trail', 'green', 'Mentored project work with a nonprofit partner. Build a portfolio of verifiable experience.'], ['Trail of Mastery', 'gray', 'Advanced engagements and applied judgment. Opens Fall 2026 — join the waitlist.']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-body)',
      color: 'var(--tt-text)'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'linear-gradient(180deg, var(--tt-sky-100), var(--tt-trail-light))',
      padding: '72px 40px 64px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.1fr .9fr',
      gap: '48px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Pill, {
    tone: "green"
  }, "Salesforce workforce development"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '46px',
      lineHeight: 1.1,
      color: 'var(--tt-heading)',
      margin: '18px 0 16px'
    }
  }, "Find your trail into a Salesforce career."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '18px',
      lineHeight: 1.6,
      maxWidth: '520px',
      margin: '0 0 28px'
    }
  }, "You earned the certification. We help you build the verifiable, on-the-job experience employers actually ask for \u2014 through supervised project work and expert mentorship."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '14px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "amber",
    size: "lg",
    onClick: () => onNav('involved')
  }, "Take the Next Step \u2192"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: () => onNav('programs')
  }, "View All Trails"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '320px',
      borderRadius: 'var(--tt-radius-lg)',
      background: 'linear-gradient(135deg, var(--tt-green-300), var(--tt-deep-teal))',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '22px',
      boxShadow: 'var(--tt-shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--tt-font-accent)',
      fontWeight: 600,
      fontSize: '30px',
      color: '#fff'
    }
  }, "real work, real mentorship")))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '40px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: '24px'
    }
  }, stats.map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '40px',
      color: 'var(--tt-trail-green)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px',
      color: 'var(--tt-slate)'
    }
  }, l)))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      borderTop: '1px solid var(--tt-border)',
      borderBottom: '1px solid var(--tt-border)',
      padding: '56px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '32px',
      color: 'var(--tt-heading)',
      margin: '0 0 8px',
      textAlign: 'center'
    }
  }, "The trail, step by step"), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      margin: '0 0 40px',
      fontSize: '16px'
    }
  }, "Every step counts. We celebrate momentum over perfection."), /*#__PURE__*/React.createElement(Stepper, {
    steps: ['Apply', 'Onboard', 'Project Work', 'Validation', 'Graduate'],
    current: 2
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '56px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: '28px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '32px',
      color: 'var(--tt-heading)',
      margin: 0
    }
  }, "Choose your trail"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => onNav('programs')
  }, "View All Trails \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: '24px'
    }
  }, programs.map(([title, tone, body]) => /*#__PURE__*/React.createElement(Card, {
    key: title,
    title: title,
    media: true,
    style: {
      maxWidth: 'none'
    },
    footer: /*#__PURE__*/React.createElement("a", {
      onClick: () => onNav('programs'),
      style: {
        color: 'var(--tt-link)',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer'
      }
    }, "Explore trail \u2192")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: tone
  }, tone === 'gray' ? 'Coming Soon' : 'Enrolling')), body)))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--tt-trail-green)',
      padding: '56px 40px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '30px',
      color: '#fff',
      margin: '0 0 12px'
    }
  }, "Ready to take the next step?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'rgba(255,255,255,.85)',
      fontSize: '16px',
      margin: '0 0 24px'
    }
  }, "Applications for the Guided Trail are open now."), /*#__PURE__*/React.createElement(Button, {
    variant: "amber",
    size: "lg",
    onClick: () => onNav('involved')
  }, "Start your application \u2192")));
}
Object.assign(window, {
  TT_Home: Home
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Programs.jsx
try { (() => {
/* Transition Trails — website Programs screen. */
const {
  Button,
  Card,
  Pill,
  Alert,
  Stepper
} = window.TransitionTrailsDesignSystem_335df4;
function Programs({
  onNav
}) {
  const rows = [{
    title: 'Foundations Trail',
    tone: 'teal',
    status: 'Enrolling',
    len: '6 weeks',
    body: 'Bridge from certification to practice. Structured exercises and a guided first project with mentor check-ins.',
    tag: 'Guided Trail'
  }, {
    title: 'Guided Trail',
    tone: 'green',
    status: 'Enrolling',
    len: '12 weeks',
    body: 'Supervised project work with a nonprofit partner. Build a verifiable portfolio and a credible signal of workforce readiness.',
    tag: 'Flagship'
  }, {
    title: 'Trail of Mastery',
    tone: 'gray',
    status: 'Coming Soon',
    len: 'Fall 2026',
    body: 'Advanced engagements demonstrating applied judgment across multiple partner projects.',
    tag: 'Waitlist'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-body)',
      color: 'var(--tt-text)'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--tt-sky-100)',
      padding: '56px 40px',
      borderBottom: '1px solid var(--tt-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: "teal"
  }, "Programs"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '40px',
      color: 'var(--tt-heading)',
      margin: '16px 0 12px'
    }
  }, "Learning paths built on real experience."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '17px',
      maxWidth: '640px',
      margin: 0,
      lineHeight: 1.6
    }
  }, "Each trail is a supervised, documented pathway. Start where you are \u2014 every milestone is proof employers can trust."))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '48px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.title,
    style: {
      display: 'grid',
      gridTemplateColumns: '200px 1fr auto',
      gap: '28px',
      alignItems: 'center',
      background: '#fff',
      border: '1px solid var(--tt-border)',
      borderRadius: 'var(--tt-radius-lg)',
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '110px',
      borderRadius: 'var(--tt-radius-md)',
      background: 'linear-gradient(135deg, var(--tt-green-100), var(--tt-green-300))'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: r.tone
  }, r.status), /*#__PURE__*/React.createElement(Pill, {
    tone: "gray"
  }, r.len)), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '23px',
      color: 'var(--tt-heading)',
      margin: '0 0 6px'
    }
  }, r.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '15px',
      lineHeight: 1.6,
      maxWidth: '540px'
    }
  }, r.body)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: '150px'
    }
  }, r.status === 'Coming Soon' ? /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => onNav('involved')
  }, "Join waitlist") : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => onNav('involved')
  }, "Apply now"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => onNav('programs')
  }, "Details \u2192"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '32px'
    }
  }, /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    title: "For nonprofits"
  }, "Partner with us to host a supervised project engagement \u2014 build capacity while a learner gains critical experience."))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      borderTop: '1px solid var(--tt-border)',
      padding: '48px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '28px',
      color: 'var(--tt-heading)',
      margin: '0 0 28px'
    }
  }, "What the Guided Trail looks like"), /*#__PURE__*/React.createElement(Stepper, {
    steps: ['Apply', 'Onboard', 'Project Work', 'Validation', 'Graduate'],
    current: 0
  }))));
}
Object.assign(window, {
  TT_Programs: Programs
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Programs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteChrome.jsx
try { (() => {
/* Transition Trails — website shared chrome: Icon, Header, Footer.
   Exports to window.TT_Site so sibling babel scripts can use them. */
const {
  useEffect,
  useRef
} = React;
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  style
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          stroke: color,
          'stroke-width': 1.9
        }
      });
    }
  }, [name, size, color]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: 'inline-flex',
      lineHeight: 0,
      ...style
    }
  });
}
function Header({
  current,
  onNav
}) {
  const links = [['home', 'Home'], ['programs', 'Programs'], ['involved', 'Get Involved']];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 40px',
      background: 'var(--tt-deep-teal)',
      fontFamily: 'var(--tt-font-body)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('home'),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '1px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '20px',
      color: '#fff',
      letterSpacing: '.01em'
    }
  }, "Transition Trails"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      color: 'var(--tt-sky-blue)',
      letterSpacing: '.14em',
      textTransform: 'uppercase'
    }
  }, "Bridging the experience gap")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '28px'
    }
  }, links.map(([id, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => onNav(id),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--tt-font-body)',
      fontSize: '15px',
      fontWeight: current === id ? 600 : 400,
      color: current === id ? '#fff' : 'rgba(255,255,255,.82)',
      borderBottom: current === id ? '2px solid var(--tt-sun-amber)' : '2px solid transparent',
      padding: '4px 0'
    }
  }, label)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('involved'),
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '14px',
      background: 'var(--tt-sun-amber)',
      color: 'var(--tt-charcoal)',
      border: 'none',
      padding: '10px 20px',
      borderRadius: 'var(--tt-radius-md)',
      cursor: 'pointer',
      boxShadow: 'var(--tt-shadow-amber)'
    }
  }, "Donate")));
}
function Footer({
  onNav
}) {
  const cols = [['Programs', ['Foundations Trail', 'Guided Trail', 'Trail of Mastery', 'For Nonprofits']], ['Organization', ['Our Mission', 'Impact & Evidence', 'Team', 'Governance']], ['Community', ['Volunteer', 'Partner With Us', 'Notes from the Trail', 'Digital Compass']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--tt-charcoal)',
      color: 'rgba(255,255,255,.72)',
      padding: '48px 40px 32px',
      fontFamily: 'var(--tt-font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
      gap: '32px',
      maxWidth: '1120px',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 700,
      fontSize: '18px',
      color: '#fff',
      marginBottom: '10px'
    }
  }, "Transition Trails"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13.5px',
      lineHeight: 1.6,
      maxWidth: '260px',
      margin: 0
    }
  }, "Empowering individuals and organizations by bridging the experience gap through education, mentorship, and hands-on work.")), cols.map(([title, items]) => /*#__PURE__*/React.createElement("div", {
    key: title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--tt-font-heading)',
      fontWeight: 600,
      fontSize: '13px',
      color: '#fff',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '.06em'
    }
  }, title), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav && onNav('home'),
    style: {
      color: 'rgba(255,255,255,.72)',
      textDecoration: 'none',
      fontSize: '13.5px',
      cursor: 'pointer'
    }
  }, it))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '32px auto 0',
      paddingTop: '20px',
      borderTop: '1px solid rgba(255,255,255,.14)',
      fontSize: '12.5px',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Transition Trails \xB7 transitiontrails.org"), /*#__PURE__*/React.createElement("span", null, "Angela Hines, Founder & CEO")));
}
Object.assign(window, {
  TT_Site: {
    Icon,
    Header,
    Footer
  }
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteChrome.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.Stepper = __ds_scope.Stepper;

})();
