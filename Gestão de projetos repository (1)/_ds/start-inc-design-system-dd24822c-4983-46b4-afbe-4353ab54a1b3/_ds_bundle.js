/* @ds-bundle: {"format":4,"namespace":"STARTINCDesignSystem_dd2482","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Navbar","sourcePath":"components/navigation/Navbar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"a74425eb3bfd","components/core/Button.jsx":"ece496857ad0","components/core/Card.jsx":"503c702e7d5a","components/core/Tag.jsx":"6e0d3e980195","components/feedback/Dialog.jsx":"fdfbbfa91f00","components/feedback/Toast.jsx":"babbe01173c1","components/feedback/Tooltip.jsx":"fb72334cacda","components/forms/Checkbox.jsx":"6cdae047c496","components/forms/Input.jsx":"6842a9857bbe","components/forms/Radio.jsx":"d12246ba0e09","components/forms/Select.jsx":"bc398ca6648c","components/forms/Switch.jsx":"13e393b597aa","components/navigation/Navbar.jsx":"f2d8127ce035","components/navigation/Tabs.jsx":"e45cd560dcdb","ui_kits/website/About.jsx":"a290237917d7","ui_kits/website/Avatar.jsx":"2bbb23c10434","ui_kits/website/Blog.jsx":"5fa774a9da48","ui_kits/website/BrandPortfolio.jsx":"f12676755efb","ui_kits/website/CTABanner.jsx":"d3653feb8721","ui_kits/website/ClientLogos.jsx":"ca10cf342c96","ui_kits/website/Contact.jsx":"3777c1af7096","ui_kits/website/Footer.jsx":"9283f9f550e7","ui_kits/website/Hero.jsx":"d46694e3e2e1","ui_kits/website/Icon.jsx":"869be4835198","ui_kits/website/Logo.jsx":"9b44d9771129","ui_kits/website/Mission.jsx":"00f5b4f1aae1","ui_kits/website/Newsletter.jsx":"bbcd0ccf7b85","ui_kits/website/Services.jsx":"d06dbfd1d30f","ui_kits/website/Team.jsx":"8692d03730e5","ui_kits/website/Testimonials.jsx":"a795ce02f3ce"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.STARTINCDesignSystem_dd2482 = window.STARTINCDesignSystem_dd2482 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  tone = 'primary',
  children
}) {
  const tones = {
    primary: {
      background: 'var(--color-primary-tint)',
      color: 'var(--color-primary)'
    },
    success: {
      background: '#EAFBF1',
      color: '#178A48'
    },
    warning: {
      background: '#FEF6E7',
      color: '#B4740A'
    },
    error: {
      background: '#FDEDED',
      color: '#C4302B'
    },
    neutral: {
      background: 'var(--color-bg-subtle)',
      color: 'var(--color-text-muted)'
    },
    dark: {
      background: 'rgba(255,255,255,0.1)',
      color: '#fff'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      font: 'var(--text-caption)',
      fontWeight: 700,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      fontSize: 11,
      ...tones[tone]
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  disabled = false,
  children,
  onClick
}) {
  const sizes = {
    sm: {
      padding: '8px 16px',
      font: 'var(--text-body-sm)'
    },
    md: {
      padding: '12px 22px',
      font: 'var(--text-label)'
    },
    lg: {
      padding: '15px 28px',
      font: 'var(--text-label)'
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'all var(--duration-base) var(--ease-standard)',
    opacity: disabled ? 0.5 : 1,
    ...sizes[size]
  };
  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: '#fff'
    },
    secondary: {
      background: '#fff',
      color: 'var(--color-primary)',
      borderColor: 'var(--color-primary)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text)',
      borderColor: 'transparent'
    },
    dark: {
      background: 'var(--color-dark)',
      color: '#fff'
    }
  };
  const [hover, setHover] = React.useState(false);
  const hoverStyle = !disabled && hover ? variant === 'primary' ? {
    background: 'var(--color-primary-hover)',
    transform: 'translateY(-1px)'
  } : variant === 'secondary' ? {
    background: 'var(--color-primary-tint)'
  } : variant === 'dark' ? {
    background: '#2A3763'
  } : {
    background: 'var(--color-bg-subtle)'
  } : {};
  return /*#__PURE__*/React.createElement("button", {
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...variants[variant],
      ...hoverStyle
    }
  }, icon && iconPosition === 'left' && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      display: 'flex'
    }
  }, icon), children, icon && iconPosition === 'right' && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      display: 'flex'
    }
  }, icon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  padding = 'lg',
  hoverable = false,
  children,
  style
}) {
  const paddings = {
    md: '20px',
    lg: '32px',
    xl: '40px'
  };
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => hoverable && setHover(true),
    onMouseLeave: () => hoverable && setHover(false),
    style: {
      background: '#fff',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: paddings[padding],
      boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
      transform: hover ? 'translateY(-3px)' : 'none',
      transition: 'all var(--duration-base) var(--ease-standard)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function Tag({
  children,
  onRemove
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-bg-subtle)',
      border: '1px solid var(--color-border)',
      font: 'var(--text-body-sm)',
      color: 'var(--color-text)'
    }
  }, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--color-text-muted)',
      padding: 0,
      fontSize: 14,
      lineHeight: 1
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  title,
  children,
  onClose,
  actions
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      width: 420,
      padding: 32,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-heading-lg)',
      color: 'var(--color-dark)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: 20,
      color: 'var(--color-text-muted)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text)',
      marginBottom: 24
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10
    }
  }, actions)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = 'success',
  title,
  message,
  onClose
}) {
  const tones = {
    success: {
      border: 'var(--color-success)',
      icon: '✓'
    },
    error: {
      border: 'var(--color-error)',
      icon: '!'
    },
    warning: {
      border: 'var(--color-warning)',
      icon: '!'
    }
  };
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      background: '#fff',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      borderLeft: `3px solid ${t.border}`,
      padding: '16px 18px',
      width: 320,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: t.border,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      flexShrink: 0
    }
  }, t.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-heading-sm)',
      color: 'var(--color-dark)',
      marginBottom: 2
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)'
    }
  }, message)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--color-text-muted)',
      fontSize: 16
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children
}) {
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-block'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: '125%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-dark)',
      color: '#fff',
      padding: '6px 10px',
      borderRadius: 'var(--radius-sm)',
      font: 'var(--text-caption)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-md)',
      zIndex: 10
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked,
  onChange
}) {
  const [isChecked, setChecked] = React.useState(!!checked);
  const val = checked !== undefined ? checked : isChecked;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)'
    },
    onClick: () => {
      onChange ? onChange(!val) : setChecked(!val);
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 6,
      border: `1.5px solid ${val ? 'var(--color-primary)' : 'var(--color-border)'}`,
      background: val ? 'var(--color-primary)' : '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--duration-fast) var(--ease-standard)'
    }
  }, val && /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "10",
    viewBox: "0 0 12 10",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 5l3.5 3.5L11 1",
    stroke: "#fff",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  type = 'text',
  helperText,
  error,
  disabled,
  icon
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-body)'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-sm)',
      fontWeight: 600,
      color: 'var(--color-dark)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      border: `1px solid ${error ? 'var(--color-error)' : focus ? 'var(--color-primary)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '11px 14px',
      background: disabled ? 'var(--color-bg-subtle)' : '#fff',
      boxShadow: focus ? 'var(--shadow-focus)' : 'none',
      transition: 'all var(--duration-base) var(--ease-standard)'
    }
  }, icon, /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      border: 'none',
      outline: 'none',
      flex: 1,
      font: 'var(--text-body-md)',
      color: 'var(--color-text)',
      background: 'transparent'
    }
  })), helperText && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-caption)',
      color: error ? 'var(--color-error)' : 'var(--color-text-muted)'
    }
  }, helperText));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked,
  onChange,
  name
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    checked: checked,
    onChange: onChange,
    style: {
      display: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    onClick: onChange,
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--duration-fast) var(--ease-standard)'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--color-primary)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text)'
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  options = [],
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-body)'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-sm)',
      fontWeight: 600,
      color: 'var(--color-dark)'
    }
  }, label), /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: onChange,
    style: {
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '11px 14px',
      font: 'var(--text-body-md)',
      color: 'var(--color-text)',
      background: '#fff url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><path d="M1 1l5 5 5-5" stroke="%2364748B" fill="none" stroke-width="1.5"/></svg>\') no-repeat right 14px center',
      appearance: 'none',
      cursor: 'pointer'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  label
}) {
  const [isOn, setOn] = React.useState(!!checked);
  const val = checked !== undefined ? checked : isOn;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)'
    },
    onClick: () => {
      onChange ? onChange(!val) : setOn(!val);
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 24,
      borderRadius: 'var(--radius-pill)',
      padding: 2,
      background: val ? 'var(--color-primary)' : 'var(--slate-200)',
      transition: 'background var(--duration-base) var(--ease-standard)',
      display: 'flex',
      justifyContent: val ? 'flex-end' : 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-xs)',
      transition: 'all var(--duration-base) var(--ease-standard)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Navbar.jsx
try { (() => {
function Navbar({
  logo,
  links = [],
  cta
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 40px',
      fontFamily: 'var(--font-display)',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }
  }, logo, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 32
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      font: 'var(--text-label)',
      color: 'var(--color-text)',
      fontWeight: 600
    }
  }, l))), cta);
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  defaultIndex = 0
}) {
  const [active, setActive] = React.useState(defaultIndex);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--color-border)'
    }
  }, tabs.map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: t.label,
    onClick: () => setActive(i),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '12px 18px',
      font: 'var(--text-label)',
      color: active === i ? 'var(--color-primary)' : 'var(--color-text-muted)',
      borderBottom: `2px solid ${active === i ? 'var(--color-primary)' : 'transparent'}`,
      marginBottom: -1,
      transition: 'all var(--duration-base) var(--ease-standard)'
    }
  }, t.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 4px',
      font: 'var(--text-body-md)',
      color: 'var(--color-text)'
    }
  }, tabs[active]?.content));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/About.jsx
try { (() => {
function About() {
  const {
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  const stats = ['+200 Empresas Atendidas, no Brasil e Exterior', '+6 Milhões Investidos em Anúncios', '+500 Mil Leads Gerados', '+150 Milhões em Faturamento para Clientes'];
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.2fr 0.8fr',
      gap: 56,
      alignItems: 'center'
    }
  }, React.createElement('div', null, React.createElement(Badge, {
    tone: 'primary'
  }, 'Sobre Nós'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16
    }
  }, 'Sobre a Start Inc. O que nos torna diferentes?'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 16,
      maxWidth: 560
    }
  }, 'Nós ajudamos empresas, infoprodutores e negócios locais a conquistarem mais clientes e faturamento por meio de estratégias digitais comprovadas.'), React.createElement('div', {
    style: {
      font: 'var(--text-label)',
      color: 'var(--color-dark)',
      marginTop: 28,
      marginBottom: 12
    }
  }, 'Nossos números falam por si:'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, stats.map(s => React.createElement('div', {
    key: s,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      font: 'var(--text-body-md)',
      color: 'var(--color-text)'
    }
  }, React.createElement(window.Icon, {
    name: 'trending-up',
    size: 18,
    color: 'var(--color-primary)'
  }), React.createElement('span', null, s))))), React.createElement('div', {
    style: {
      textAlign: 'center'
    }
  }, /* imagem real: startcompanydigital.com/wp-content/uploads/2025/03/agency-img2.jpg (domínio bloqueado aqui) */
  React.createElement('div', {
    style: {
      width: '100%',
      maxWidth: 380,
      aspectRatio: '500/680',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-bg-subtle)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-text-muted)',
      font: 'var(--text-caption)',
      margin: '0 auto'
    }
  }, 'Foto — agency-img2.jpg'), React.createElement('div', {
    style: {
      font: 'var(--text-display-md)',
      color: 'var(--color-primary)',
      letterSpacing: 'var(--tracking-tight)',
      marginTop: 20
    }
  }, '+7'), React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      color: 'var(--color-dark)',
      marginTop: 2
    }
  }, 'ANOS'), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)'
    }
  }, 'de experiência')));
}
window.About = About;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/About.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Avatar.jsx
try { (() => {
function Avatar({
  initials,
  size = 96
}) {
  return React.createElement('div', {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--gradient-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      font: 'var(--text-heading-lg)',
      flexShrink: 0
    }
  }, initials);
}
window.Avatar = Avatar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Avatar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Blog.jsx
try { (() => {
function Blog() {
  const {
    Card,
    Badge,
    Tag
  } = window.STARTINCDesignSystem_dd2482;
  const posts = [{
    title: '“5 Estratégias de Marketing de Conteúdo que Dobram Sua Audiência”',
    desc: 'Aprenda 5 estratégias de marketing de conteúdo que dobram sua audiência e impulsionam seus negócios.'
  }, {
    title: 'Descubra o Segredo do Relacionamento com Cliente que Transforma Vendas',
    desc: 'Aprenda o segredo do relacionamento cliente que transforma suas vendas hoje mesmo.'
  }, {
    title: '“Como Fazer Tráfego Pago Trabalhar Para Você?”',
    desc: 'Aprenda a otimizar o tráfego pago SEO e maximize suas conversões com estratégias eficazes.'
  }];
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement('div', {
    style: {
      textAlign: 'center',
      maxWidth: 640,
      margin: '0 auto 56px'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Conheça Nosso Blog'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16
    }
  }, 'Blog & Nossas Notícias!'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12
    }
  }, 'Não perca as novidades do blog: artigos fresquinhos, dicas exclusivas e conteúdos que vão turbinar seu dia!')), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24
    }
  }, posts.map(p => React.createElement(Card, {
    key: p.title,
    hoverable: true,
    padding: 'md'
  }, React.createElement('div', {
    style: {
      height: 140,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-subtle)',
      border: '1px solid var(--color-border)',
      marginBottom: 20
    }
  }), React.createElement(Tag, null, 'Uncategorized'), React.createElement('div', {
    style: {
      font: 'var(--text-heading-sm)',
      color: 'var(--color-dark)',
      marginTop: 12,
      lineHeight: 1.3
    }
  }, p.title), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)',
      marginTop: 10
    }
  }, p.desc)))));
}
window.Blog = Blog;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Blog.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/BrandPortfolio.jsx
try { (() => {
function BrandPortfolio() {
  const {
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  return React.createElement('section', {
    style: {
      padding: '80px 40px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 12
    }
  }, Array.from({
    length: 6
  }).map((_, i) => React.createElement('div', {
    key: i,
    style: {
      aspectRatio: '3/4',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-subtle)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-text-muted)',
      font: 'var(--text-caption)',
      textAlign: 'center',
      padding: 10
    }
  }, 'Proposta de branding'))), React.createElement('div', {
    style: {
      textAlign: 'center',
      marginTop: 12,
      font: 'var(--text-caption)',
      color: 'var(--color-text-muted)'
    }
  }, 'Placeholder — substituir pelas imagens reais do portfólio de branding.'));
}
window.BrandPortfolio = BrandPortfolio;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/BrandPortfolio.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/CTABanner.jsx
try { (() => {
function CTABanner() {
  const {
    Button
  } = window.STARTINCDesignSystem_dd2482;
  return React.createElement('section', {
    style: {
      padding: '90px 40px',
      background: 'var(--gradient-dark)',
      textAlign: 'center'
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-sm)',
      color: 'rgba(255,255,255,0.7)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)'
    }
  }, 'Mude o resultado da sua empresa'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-md)',
      color: '#fff',
      letterSpacing: 'var(--tracking-tight)',
      marginTop: 8
    }
  }, 'AINDA HOJE!'), React.createElement('p', {
    style: {
      font: 'var(--text-body-lg)',
      color: 'rgba(255,255,255,0.72)',
      maxWidth: 520,
      margin: '20px auto 36px'
    }
  }, 'Faça seu cadastro digital e garanta uma sessão estratégica com nosso time de especialistas.'), React.createElement(Button, {
    variant: 'primary',
    size: 'lg'
  }, 'FALE COM NOSSO TIME DE ESPECIALISTAS'));
}
window.CTABanner = CTABanner;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/CTABanner.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ClientLogos.jsx
try { (() => {
function ClientLogos() {
  const {
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  return React.createElement('section', {
    style: {
      padding: '80px 40px',
      maxWidth: 1200,
      margin: '0 auto',
      textAlign: 'center'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Nosso Portfólio'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16
    }
  }, 'Marcas que já impulsionamos'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12,
      maxWidth: 560,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  }, 'Empresas e marcas que impulsionamos com estratégias de alta performance.'), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 16,
      marginTop: 40
    }
  }, Array.from({
    length: 6
  }).map((_, i) => React.createElement('div', {
    key: i,
    style: {
      height: 72,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-subtle)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-text-muted)',
      font: 'var(--text-caption)'
    }
  }, 'Logo'))), React.createElement('div', {
    style: {
      marginTop: 12,
      font: 'var(--text-caption)',
      color: 'var(--color-text-muted)'
    }
  }, 'Placeholder — substituir pelos logos reais de clientes.'));
}
window.ClientLogos = ClientLogos;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ClientLogos.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Contact.jsx
try { (() => {
function Contact() {
  const {
    Card,
    Badge,
    Input,
    Button
  } = window.STARTINCDesignSystem_dd2482;
  const counters = [['Investidos em anúncios online', '7M+'], ['Empresas atendidas', '217+'], ['Faturados para Clientes', '155M+'], ['Paises atendidos', '6+']];
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Contato'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16,
      maxWidth: 680
    }
  }, 'Entre em Contato & Escale os seus negócios'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12,
      maxWidth: 680
    }
  }, 'Transforme sua empresa com estratégias digitais de alta performance. Seja tráfego pago, SEO ou automação de vendas, estamos prontos para impulsionar seus resultados.'), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '0.9fr 1.1fr',
      gap: 48,
      marginTop: 48
    }
  }, React.createElement('div', null, React.createElement('div', {
    style: {
      marginBottom: 24
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-label)',
      color: 'var(--color-dark)'
    }
  }, 'Endereço Comercial'), React.createElement('div', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 4
    }
  }, 'R. Gomes Jardim, 723 - Santana, Porto Alegre - RS')), React.createElement('div', {
    style: {
      marginBottom: 24
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-label)',
      color: 'var(--color-dark)'
    }
  }, 'Número de telefone'), React.createElement('div', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 4
    }
  }, '(+55) 51 99149-0515')), React.createElement('div', {
    style: {
      marginBottom: 32
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-label)',
      color: 'var(--color-dark)'
    }
  }, 'Endereço Eletrônico'), React.createElement('div', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-primary)',
      marginTop: 4
    }
  }, 'contato@startcompanydigital.com')), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, counters.map(([label, val]) => React.createElement('div', {
    key: label
  }, React.createElement('div', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-primary)'
    }
  }, val), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)'
    }
  }, label))))), React.createElement(Card, {
    padding: 'lg'
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      color: 'var(--color-dark)'
    }
  }, 'Fale Conosco'), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)',
      marginTop: 8,
      marginBottom: 24
    }
  }, 'Fale com a gente e descubra como podemos transformar o seu negócio.'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, React.createElement(Input, {
    label: 'Nome',
    placeholder: 'Seu nome completo'
  }), React.createElement(Input, {
    label: 'Email',
    placeholder: 'voce@empresa.com',
    type: 'email'
  }), React.createElement(Input, {
    label: 'Mensagem',
    placeholder: 'Como podemos ajudar?'
  }), React.createElement(Button, {
    variant: 'primary'
  }, 'Fale com o Time da Start Inc.')))));
}
window.Contact = Contact;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Contact.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
function Footer() {
  const links = ['Home', 'Sobre Nós', 'Serviços', 'Clientes', 'Blog'];
  const certs = ['Google Partner', 'Meta Business Partner', 'Google Partner Premier', 'Active Campaign Partner'];
  /* selos reais (domínio bloqueado aqui): startcompanydigital.com/wp-content/uploads/2025/04/{O-que-e-necessario-para-adquirir-o-selo-Google-Partners.webp, Meta-Business-Partner-Selo.webp, partner-1024x576.png.webp, active-campaign-partner.png} */
  return React.createElement('footer', {
    style: {
      background: 'var(--color-dark)',
      color: '#fff'
    }
  }, React.createElement('div', {
    style: {
      padding: '64px 40px 32px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr',
      gap: 32,
      paddingBottom: 48,
      borderBottom: '1px solid var(--color-border-dark)'
    }
  }, React.createElement('div', null, React.createElement(window.Logo, {
    dark: true,
    height: 28
  }), React.createElement('p', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-on-dark-muted)',
      marginTop: 16,
      maxWidth: 280
    }
  }, 'Nos acompanhe nas redes sociais.'), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 14
    }
  }, ['Facebook|f', 'Instagram|ig'].map(s => {
    const [label, glyph] = s.split('|');
    return React.createElement('span', {
      key: label,
      title: label,
      style: {
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        font: '700 14px/1 var(--font-display)'
      }
    }, glyph);
  }))), React.createElement('div', null, React.createElement('div', {
    style: {
      font: 'var(--text-label)',
      color: '#fff',
      marginBottom: 14
    }
  }, 'Links Úteis'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, links.map(l => React.createElement('a', {
    key: l,
    href: '#',
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-on-dark-muted)'
    }
  }, l)))), React.createElement('div', null, React.createElement('div', {
    style: {
      font: 'var(--text-label)',
      color: '#fff',
      marginBottom: 14
    }
  }, 'Informações de contato'), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-on-dark-muted)',
      lineHeight: 1.8
    }
  }, 'R. Gomes Jardim, 723 - Santana, Porto Alegre - RS, 90620-130', React.createElement('br'), '+55 51 99149-0515', React.createElement('br'), 'contato@startcompanydigital.com'))), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 16,
      justifyContent: 'center',
      flexWrap: 'wrap',
      padding: '32px 0',
      borderBottom: '1px solid var(--color-border-dark)'
    }
  }, certs.map(c => React.createElement('span', {
    key: c,
    style: {
      padding: '8px 16px',
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(255,255,255,0.08)',
      font: 'var(--text-caption)',
      color: 'rgba(255,255,255,0.75)'
    }
  }, c))), React.createElement('div', {
    style: {
      textAlign: 'center',
      paddingTop: 24,
      font: 'var(--text-caption)',
      color: 'var(--color-text-on-dark-muted)'
    }
  }, 'Copyright © 2026 Start Inc. Todos os direitos reservados.')));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
function Hero() {
  const {
    Button
  } = window.STARTINCDesignSystem_dd2482;
  return React.createElement('section', {
    style: {
      padding: '140px 40px 90px',
      maxWidth: 1100,
      margin: '0 auto',
      textAlign: 'center'
    }
  }, React.createElement('div', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-primary-tint)',
      color: 'var(--color-primary)',
      font: 'var(--text-caption)',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      marginBottom: 28
    }
  }, 'START INC.'), React.createElement('h1', {
    style: {
      font: 'var(--text-display-xl)',
      color: 'var(--color-dark)',
      letterSpacing: 'var(--tracking-tight)',
      maxWidth: 880,
      margin: '0 auto'
    }
  }, 'START INC. Impulsione seu negócio no digital!'), React.createElement('p', {
    style: {
      font: 'var(--text-body-lg)',
      color: 'var(--color-text-muted)',
      maxWidth: 620,
      margin: '24px auto 40px'
    }
  }, 'Acelere seu crescimento no digital! Criamos estratégias personalizadas para atrair mais clientes e multiplicar suas vendas de forma previsível.'), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 14,
      justifyContent: 'center',
      flexWrap: 'wrap'
    }
  }, React.createElement(Button, {
    variant: 'primary',
    size: 'lg'
  }, 'Quero me destacar no mercado'), React.createElement(Button, {
    variant: 'secondary',
    size: 'lg'
  }, 'Quero vender mais meus serviços')));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Icon.jsx
try { (() => {
function toPascalCase(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}
function Icon({
  name,
  size = 20,
  color = 'currentColor'
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let cancelled = false;
    let timer = null;
    function paint() {
      if (cancelled) return;
      if (!name) return;
      if (!window.lucide || !ref.current) {
        timer = setTimeout(paint, 60);
        return;
      }
      const key = toPascalCase(name);
      const iconNode = window.lucide.icons[key];
      if (iconNode) {
        const svgEl = window.lucide.createElement(iconNode);
        svgEl.setAttribute('width', size);
        svgEl.setAttribute('height', size);
        svgEl.setAttribute('stroke', color);
        svgEl.style.display = 'block';
        ref.current.innerHTML = '';
        ref.current.appendChild(svgEl);
      }
    }
    paint();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [name, size, color]);
  return React.createElement('span', {
    ref,
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      flexShrink: 0
    }
  });
}
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Logo.jsx
try { (() => {
function Logo({
  dark = false,
  height = 32
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, React.createElement('img', {
    src: dark ? '../../assets/logos/start-inc-negative-white.png' : '../../assets/logos/start-inc-horizontal-blue.png',
    style: {
      height
    }
  }));
}
window.Logo = Logo;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Logo.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Mission.jsx
try { (() => {
function Mission() {
  const {
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  const items = [['Marketing', 95, 'Estratégias de marketing digital orientadas a resultados mensuráveis.'], ['Solution', 90, 'Soluções personalizadas para cada tipo de negócio e segmento.'], ['Success', 96, 'Taxa de sucesso comprovada por mais de 200 clientes atendidos.']];
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      background: 'var(--color-bg-subtle)'
    }
  }, React.createElement('div', {
    style: {
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Nosso Objetivo'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16,
      maxWidth: 640
    }
  }, 'Missão — Nosso objetivo é você'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12,
      maxWidth: 640
    }
  }, 'Ajudamos empresas, infoprodutores e negócios locais a conquistar mais clientes e faturamento com estratégias digitais comprovadas.'), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32,
      marginTop: 48
    }
  }, items.map(([label, pct, desc]) => React.createElement('div', {
    key: label
  }, React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-md)',
      color: 'var(--color-dark)'
    }
  }, label), React.createElement('div', {
    style: {
      font: 'var(--text-heading-md)',
      color: 'var(--color-primary)'
    }
  }, `${pct}%`)), React.createElement('div', {
    style: {
      height: 8,
      borderRadius: 'var(--radius-pill)',
      background: '#fff',
      border: '1px solid var(--color-border)',
      overflow: 'hidden'
    }
  }, React.createElement('div', {
    style: {
      height: '100%',
      width: `${pct}%`,
      background: 'var(--color-primary)',
      borderRadius: 'var(--radius-pill)'
    }
  })), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)',
      marginTop: 12
    }
  }, desc))))));
}
window.Mission = Mission;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Mission.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Newsletter.jsx
try { (() => {
function Newsletter() {
  const {
    Input,
    Button,
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  return React.createElement('section', {
    style: {
      padding: '80px 40px',
      background: 'var(--color-bg-subtle)',
      textAlign: 'center'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Assine'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16,
      maxWidth: 620,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  }, 'Assine nossa Newsletter — Receba conteúdo exclusivo.'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12,
      maxWidth: 520,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  }, 'Fique por dentro das melhores estratégias de marketing digital e crescimento empresarial!'), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 32,
      maxWidth: 460,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  }, React.createElement('div', {
    style: {
      flex: 1
    }
  }, React.createElement(Input, {
    placeholder: 'Email'
  })), React.createElement(Button, {
    variant: 'primary'
  }, 'Inscreva-se agora')));
}
window.Newsletter = Newsletter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Newsletter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Services.jsx
try { (() => {
function Services() {
  const {
    Card,
    Badge,
    Button
  } = window.STARTINCDesignSystem_dd2482;
  const services = ['Gestão de Tráfego Pago', 'Desenvolvimento de Websites', 'Designer Gráfico, Criativos', 'SEO & Produção de Conteúdo', 'Automações de Vendas', 'Atendimento ao cliente com IA', 'Análise de Performance', 'Acompanhamento Comercial'];
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Serviços'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16,
      maxWidth: 720
    }
  }, 'Nossos Serviços — Como podemos ajudar você?'), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: 48,
      marginTop: 40,
      alignItems: 'center'
    }
  }, React.createElement('div', null, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      color: 'var(--color-dark)'
    }
  }, 'Marketing Digital de Alta Performance'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12
    }
  }, 'Nossa equipe desenvolve estratégias sob medida para transformar sua empresa em uma referência digital.'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      margin: '24px 0'
    }
  }, ['Soluções validadas e comprovadas para escalar negócios', 'Mais visibilidade, mais clientes e mais faturamento previsível', 'Agende uma Sessão Estratégica GRATUITA e descubra como expandir seu negócio no digital!'].map(t => React.createElement('div', {
    key: t,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      font: 'var(--text-body-sm)',
      color: 'var(--color-text)'
    }
  }, React.createElement(window.Icon, {
    name: 'check',
    size: 16,
    color: 'var(--color-primary)'
  }), React.createElement('span', null, t)))), React.createElement(Button, {
    variant: 'primary'
  }, 'Quero aumentar minhas vendas')), React.createElement(Card, {
    padding: 'lg'
  }, React.createElement('div', {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'center'
    }
  }, React.createElement(window.Avatar, {
    initials: 'ES',
    size: 72
  }), /* foto real: https://startcompanydigital.com/wp-content/uploads/2025/03/file.enc_.jpeg (domínio bloqueado aqui) */
  React.createElement('div', null, React.createElement('div', {
    style: {
      font: 'var(--text-heading-md)',
      color: 'var(--color-dark)'
    }
  }, 'Evan Santos'), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)'
    }
  }, 'CEO, Diretor'))))), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 20,
      marginTop: 56
    }
  }, services.map((s, i) => React.createElement('div', {
    key: s,
    style: {
      background: 'var(--gradient-brand)',
      borderRadius: 'var(--radius-sm)',
      padding: '28px 22px',
      transition: 'transform .2s ease, box-shadow .2s ease',
      cursor: 'default'
    },
    onMouseEnter: e => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = 'none';
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-caption)',
      color: 'rgba(255,255,255,0.75)'
    }
  }, `Serviço ${i + 1}`), React.createElement('div', {
    style: {
      font: 'var(--text-heading-sm)',
      color: '#fff',
      marginTop: 8
    }
  }, s)))));
}
window.Services = Services;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Services.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Team.jsx
try { (() => {
function Team() {
  const {
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  const members = [['ES', 'Evan Santos', 'CEO, Director'], ['SI', 'Equipe Start Inc.', 'Head Manager'], ['SI', 'Equipe Start Inc.', 'Branch Manager'], ['SI', 'Equipe Start Inc.', 'Supervisor']];
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement('div', {
    style: {
      textAlign: 'center',
      maxWidth: 640,
      margin: '0 auto 56px'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Nossa Equipe'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16
    }
  }, 'Nossa Equipe'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12
    }
  }, 'Conheça os especialistas por trás dos resultados dos nossos clientes. Um time comprometido com o seu crescimento no digital.')), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 24
    }
  }, members.map(([initials, name, role], i) => React.createElement('div', {
    key: i,
    style: {
      textAlign: 'center'
    }
  }, React.createElement(window.Avatar, {
    initials,
    size: 120
  }), React.createElement('div', {
    style: {
      font: 'var(--text-heading-sm)',
      color: 'var(--color-dark)',
      marginTop: 16
    }
  }, name), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)',
      marginTop: 4
    }
  }, role)))));
}
window.Team = Team;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Team.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Testimonials.jsx
try { (() => {
function Testimonials() {
  const {
    Card,
    Badge
  } = window.STARTINCDesignSystem_dd2482;
  const items = [{
    quote: 'A Start Inc. mudou completamente o jogo para minha empresa. Mais de 15 mil clientes em um único evento. Foi record vendas e um posicionamento que nunca tive antes!',
    name: 'Gerson Marinho (Moving Festival)',
    role: 'Cliente',
    rating: 5,
    initials: 'GM'
  }, {
    quote: 'O método deles é incrível! Em poucos meses, meu estúdio triplicou as vendas!',
    name: 'Renata Ferraz',
    role: 'Empresária',
    rating: 4.5,
    initials: 'RF'
  }, {
    quote: 'A Start Inc. ajudou meu consultório a crescer no digital de forma rápida e eficiente!',
    name: 'Drª. Marcela Satte',
    role: 'Cliente',
    rating: 4.5,
    initials: 'MS'
  }]; /* fotos reais em startcompanydigital.com/wp-content/uploads/2025/03/ (domínio bloqueado aqui) */
  return React.createElement('section', {
    style: {
      padding: '100px 40px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, React.createElement('div', {
    style: {
      textAlign: 'center',
      maxWidth: 680,
      margin: '0 auto 56px'
    }
  }, React.createElement(Badge, {
    tone: 'primary'
  }, 'Depoimentos'), React.createElement('h2', {
    style: {
      font: 'var(--text-display-sm)',
      color: 'var(--color-dark)',
      marginTop: 16
    }
  }, 'O que nossos clientes dizem'), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text-muted)',
      marginTop: 12
    }
  }, 'Mais de 200 empresas já transformaram seus negócios com a Start Inc.! Veja o que nossos clientes falam sobre os resultados.')), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24
    }
  }, items.map(it => React.createElement(Card, {
    key: it.name
  }, React.createElement(window.Avatar, {
    initials: it.initials,
    size: 64
  }), React.createElement('p', {
    style: {
      font: 'var(--text-body-md)',
      color: 'var(--color-text)',
      marginTop: 16,
      lineHeight: 1.6
    }
  }, it.quote), React.createElement('div', {
    style: {
      marginTop: 24,
      paddingTop: 16,
      borderTop: '1px solid var(--color-border)'
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-sm)',
      color: 'var(--color-dark)'
    }
  }, it.name), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--color-text-muted)'
    }
  }, `${it.role} · Classificado como ${it.rating} de 5`))))));
}
window.Testimonials = Testimonials;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Testimonials.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
