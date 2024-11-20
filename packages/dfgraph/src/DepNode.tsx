import React from 'react';
import { Handle, Position } from '@xyflow/react';

const style = {
    contentHeader: {
      padding: "8px 0px",
      flexGrow: 1,
      backgroundColor: "#eee"
    },
    io: {
      //position: "relative",
      padding: "8px 16px",
      flexGrow: 1
    },
    left: { left: "-8px" },
    textLeft: { textAlign: "left" },
    right: { right: "-8px" },
    textRight: { textAlign: "right" },
    handle: {
      widht: "10px", // Does not work
      height: "10px",
      margin: "auto",
      background: "#ddd",
      borderRadius: "15px",
      border: "2px solid #ddd",
      boxShadow:
        "rgba(0, 0, 0, 0.2) 0px 1px 3px 0px, rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 2px 1px -1px"
    }
  };

  const isValidOutput = (connection:any) => {
    console.log(connection)
    return true;
  };

// @ts-ignore
const DepNode = ({ data }) => {
  return (
    <div style={{ padding: '10px', border: '1px solid black', borderRadius: '5px' }}>
      <strong>{data.label}</strong>
      <div style={style.contentHeader}>{"Input"}</div>
      <Handle
        type="target"
        position={Position.Left}
        id={data.id+'handle'}
        style={{ ...style.handle, ...style.left }}
                isValidConnection={(connection) =>
                  isValidOutput(connection)
                }
        />
      
      <div style={style.contentHeader}>{"Outputs"}</div>
          {data.outputs.map((output:any,idx:any) => (
            <div
              key={output.id}
              style={{ ...style.io}}//, ...style.textRight }}
            >
              {output.label}
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}//"o-" + output.label + "__" + output.type}
                style={{ ...style.handle, ...style.right, top:(idx*30)+120 }}
                isValidConnection={(connection) =>
                  isValidOutput(connection)
                }
              />
            </div>
          ))}
    </div>
  );
};

export default DepNode;