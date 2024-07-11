import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

// Material-UI components
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

// Components
import Instances, { InstanceContext } from './instances';
import LogView from './log-view';
import Nothing from './nothing';
import Pane from 'react-split-pane/lib/Pane';
import SplitPane from 'react-split-pane';
import Toolbar from './toolbar';

// Icons
import ConsoleIcon from '@material-ui/icons/DvrSharp';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  main: {
    height: `calc(100% - ${theme.TOOLBAR_HEIGHT}px)`,
  },
  instanceListPane: {
    height: '100%',
    backgroundColor: '#282828',
    padding: theme.spacing(1),
    overflow: 'auto',
  },
  logListPane: {
    height: '100%',
    backgroundColor: '#252525',
    padding: theme.spacing(1),
    overflow: 'auto',
  },
  logPane: {
    height: '100%',
    backgroundColor: '#202020',
    padding: theme.spacing(1),
    overflow: 'auto',
  },
  listIcon: {
    minWidth: 36,
  },
}));

// Global state
const splitPos = [
  ['600px', 100],
  [1, 1],
];

function Logs({ root }) {
  const classes = useStyles();
  const instanceContext = React.useContext(InstanceContext);

  const [currentLog, setCurrentLog] = React.useState('');

  const selectLog = (name) => {
    setCurrentLog(name);
  }

  const instance = instanceContext.currentInstance;
  const status = instance?.status;
  const uuid = instance?.id ? status?.uuid : '';
  const logList = status?.logs || [];

  return (
    <div className={classes.root}>

      {/* Toolbar */}
      <Toolbar/>

      {/* Main View */}
      <div className={classes.main}>
        <SplitPane split="vertical" onChange={pos => splitPos[0] = pos}>

          <SplitPane initialSize={splitPos[0][0]} onChange={pos => splitPos[1] = pos}>

            {/* Instance List */}
            <Pane initialSize={splitPos[1][0]} className={classes.instanceListPane}>
              <Instances root={root}/>
            </Pane>

            {/* Pipeline List */}
            <Pane initialSize={splitPos[1][1]} className={classes.logListPane}>
              {logList.length === 0 ? (
                <Nothing text="No logs"/>
              ) : (
                <List dense disablePadding>
                  {logList.map(name => (
                    <ListItem
                      key={name}
                      button
                      selected={name === currentLog}
                      onClick={() => selectLog(name)}
                    >
                      <ListItemIcon className={classes.listIcon}><ConsoleIcon/></ListItemIcon>
                      <ListItemText primary={name}/>
                    </ListItem>
                  ))}
                </List>
              )}
            </Pane>

          </SplitPane>

          {/* Flowchart */}
          <Pane initialSize={splitPos[0][1]} className={classes.logPane}>
            {logList.length === 0 ? (
              <Nothing text="No logs"/>
            ) : (
              (currentLog && (
                <LogView
                  uuid={uuid}
                  name={currentLog}
                />
              )) || (
                <Nothing text="No log selected"/>
              )
            )}
          </Pane>

        </SplitPane>
      </div>
    </div>
  );
}

export default Logs;
