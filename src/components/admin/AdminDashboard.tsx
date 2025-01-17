import { useState, useEffect } from "react"
import { Box, Tab, Tabs, Typography } from "@mui/material"
import { UserManagement } from "./UserManagement"
import { ReferenceDataManagement } from "./ReferenceDataManagement"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  }
}

export function AdminDashboard() {
  // Initialize from localStorage or default to 0
  const [value, setValue] = useState(() => {
    const savedTab = localStorage.getItem('adminDashboardTab')
    return savedTab ? parseInt(savedTab, 10) : 0
  })

  // Save to localStorage whenever tab changes
  useEffect(() => {
    localStorage.setItem('adminDashboardTab', value.toString())
  }, [value])

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Admin Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="admin tabs">
          <Tab label="User Management" {...a11yProps(0)} />
          <Tab label="Reference Data" {...a11yProps(1)} />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        <UserManagement />
      </TabPanel>

      <TabPanel value={value} index={1}>
        <ReferenceDataManagement />
      </TabPanel>
    </Box>
  )
}
