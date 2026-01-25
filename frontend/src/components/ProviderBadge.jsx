/**
 * ProviderBadge - Visual indicator for which provider a server belongs to
 */

const PROVIDER_STYLES = {
    'claude-code': {
        color: '#3B82F6',
        label: 'Claude Code'
    },
    'claude-desktop': {
        color: '#8B5CF6',
        label: 'Claude Desktop'
    },
    'opencode': {
        color: '#10B981',
        label: 'OpenCode'
    }
};

function ProviderBadge({ providerId, providerName, small = false }) {
    const style = PROVIDER_STYLES[providerId] || { color: '#6B7280', label: providerName || providerId };

    return (
        <span
            className={`provider-badge ${small ? 'small' : ''}`}
            style={{
                backgroundColor: `${style.color}20`,
                color: style.color,
                padding: small ? '2px 6px' : '4px 8px',
                borderRadius: '4px',
                fontSize: small ? '10px' : '11px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            <span
                style={{
                    width: small ? '6px' : '8px',
                    height: small ? '6px' : '8px',
                    borderRadius: '50%',
                    backgroundColor: style.color
                }}
            />
            {providerName || style.label}
        </span>
    );
}

export default ProviderBadge;
