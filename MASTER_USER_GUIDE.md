# Master User Guide - Temperature Dashboard

## 👋 Welcome, Master User!

As a **Master** user, you have full administrative control over your organization's temperature monitoring system. This guide will help you navigate and manage all aspects of the temperature dashboard.

## 🔐 Your Permissions

**Full Access To:**
- ✅ All sites in your organization
- ✅ All sensors and environments
- ✅ Complete alert management (view, acknowledge, resolve)
- ✅ User management (invite new users)
- ✅ Threshold configuration at all levels
- ✅ All dashboard analytics and reports

**What You Can Do:**
- Manage sites, environments, and sensors
- Configure temperature thresholds
- Handle alert workflows
- Invite and manage team members
- Access comprehensive analytics

---

## 🧭 Navigation Guide

### 1. **Dashboard Overview** (`/overview`)
Your command center for monitoring the entire organization.

**Key Features:**
- **Organization KPIs**: Total sites, sensors, active alerts
- **Recent Alerts**: Critical temperature issues across all sites
- **Sensor Health**: Real-time status of all monitoring equipment
- **Quick Actions**: Direct links to manage alerts and sites

**What to Check First:**
1. Review critical alerts in the "Recent Alerts" section
2. Monitor sensor health indicators
3. Check KPI trends for unusual patterns

### 2. **Sites Management** (`/sites`)
Manage all physical locations in your organization.

**Available Actions:**
- **View All Sites**: Complete list with health status
- **Add New Sites**: Create new monitoring locations
- **Site Details**: Drill down into specific sites
- **Health Monitoring**: Real-time status per site

**Navigation Tips:**
- Use the search bar to quickly find specific sites
- Click "View Details" to access site-specific information
- Monitor the "Active Alerts" indicators for urgent issues

### 3. **Site Detail Pages** (`/sites/[siteId]`)
Deep dive into individual site operations.

**What You'll See:**
- **Site Overview**: Location, timezone, environment count
- **Environment List**: All areas within the site
- **Sensor Summary**: Total sensors and their status
- **Active Alerts**: Site-specific temperature issues

**Management Actions:**
- Configure site-specific thresholds
- Review environment layouts
- Access detailed sensor information

### 4. **Environment Detail Pages** (`/environments/[envId]`)
Monitor specific temperature-controlled areas.

**Key Information:**
- **Environment Type**: Cold storage, chiller, blast freezer, etc.
- **Sensor List**: All sensors in this environment
- **Current Readings**: Real-time temperature data
- **Threshold Settings**: Configured temperature limits

**Configuration Options:**
- Adjust temperature thresholds
- View sensor calibration details
- Monitor environmental conditions

### 5. **Sensor Detail Pages** (`/sensors/[sensorId]`)
Individual sensor monitoring and maintenance.

**Detailed Metrics:**
- **Current Temperature**: Live readings
- **Historical Charts**: 24-hour temperature trends
- **Sensor Health**: Battery status, connection quality
- **Location Details**: Physical placement information

**Maintenance Actions:**
- Review sensor performance history
- Identify calibration needs
- Monitor device health indicators

### 6. **Alerts Management** (`/alerts`)
Central hub for temperature alert management.

**Alert Workflow:**
1. **View Active Alerts**: Filter by status, level, site
2. **Acknowledge Alerts**: Mark alerts as acknowledged
3. **Resolve Alerts**: Close resolved temperature issues
4. **Bulk Actions**: Handle multiple alerts simultaneously

**Alert Types:**
- **Warning**: Temperature outside normal range (5+ minutes)
- **Critical**: Severe temperature breaches or rapid changes

**Best Practices:**
- Acknowledge alerts within 15 minutes
- Document resolution steps
- Review alert patterns for preventive maintenance

### 7. **Settings & Configuration** (`/settings`)
Configure system behavior and manage users.

**Threshold Management:**
- **Organization Level**: Default thresholds for all sites
- **Site Level**: Location-specific overrides
- **Environment Level**: Area-specific requirements
- **Sensor Level**: Individual sensor calibration

**User Management:**
- **Invite New Users**: Add team members
- **Role Assignment**: Set appropriate permissions
- **Site Access**: Configure site manager assignments

---

## 📊 Daily Workflow

### Morning Check-in (Start of Day)
1. **Review Dashboard Overview** - Check for overnight alerts
2. **Monitor Critical Alerts** - Address any temperature breaches
3. **Check Sensor Health** - Ensure all equipment is functioning

### Ongoing Monitoring
1. **Alert Response** - Acknowledge and resolve temperature issues
2. **Site Rounds** - Review each site's performance
3. **Threshold Adjustments** - Fine-tune based on seasonal changes

### End of Day Review
1. **Alert Summary** - Review all resolved alerts
2. **Performance Analytics** - Analyze temperature trends
3. **User Management** - Process any pending user requests

---

## 🎯 Key Responsibilities

### Temperature Management
- **Monitor** all sensors across your organization
- **Respond** to alerts within 15 minutes
- **Configure** appropriate temperature thresholds
- **Maintain** sensor calibration and health

### Team Management
- **Invite** new users with appropriate roles
- **Assign** site managers to their locations
- **Manage** auditor access with time limits
- **Coordinate** with site teams for maintenance

### System Administration
- **Configure** organization-wide settings
- **Monitor** system performance and health
- **Manage** site and environment configurations
- **Ensure** data integrity and security

---

## 🚨 Alert Response Protocol

### Critical Alerts (Immediate Action Required)
1. **Acknowledge** within 2 minutes
2. **Assess** situation severity
3. **Contact** site manager if needed
4. **Document** resolution steps
5. **Resolve** when issue is fixed

### Warning Alerts (Monitor Closely)
1. **Acknowledge** within 15 minutes
2. **Monitor** temperature trends
3. **Investigate** root causes
4. **Adjust** thresholds if needed
5. **Resolve** when stabilized

---

## 📈 Analytics & Reporting

### Available Metrics
- **Temperature Trends**: Historical data analysis
- **Alert Frequency**: Pattern recognition
- **Sensor Performance**: Uptime and reliability
- **Site Comparisons**: Performance benchmarking

### Chart Features
- **Time Range Selection**: Custom date ranges
- **Aggregation Options**: Raw, hourly, or daily data
- **Multiple Sensors**: Compare up to 25 sensors
- **Export Capabilities**: Data export for reporting

---

## 🔧 Troubleshooting

### Common Issues
- **Missing Data**: Check sensor connectivity
- **False Alerts**: Review threshold settings
- **User Access**: Verify role assignments
- **Performance**: Monitor API rate limits

### Support Resources
- **Documentation**: This guide and inline help
- **Team Communication**: Coordinate with site managers
- **System Health**: Check `/api/health` endpoint
- **Rate Limits**: Monitor API usage (60 GET/min, 20 POST/min)

---

## 🎯 Best Practices

### Alert Management
- Always acknowledge alerts promptly
- Document resolution procedures
- Review alert patterns weekly
- Adjust thresholds based on data

### User Management
- Use specific roles for security
- Set appropriate site access for managers
- Monitor auditor access expiration
- Regular user access reviews

### System Maintenance
- Regular sensor calibration checks
- Monitor battery levels and connectivity
- Review threshold effectiveness
- Plan preventive maintenance

---

## 📞 Getting Help

- **Documentation**: Refer to this guide and inline help
- **Team Support**: Contact other masters or administrators
- **Technical Issues**: Check system health and logs
- **Training**: Schedule refresher sessions as needed

---

**Remember**: As a Master user, you are responsible for the overall health and security of your organization's temperature monitoring system. Regular monitoring and prompt response to alerts are critical for maintaining product quality and safety standards.