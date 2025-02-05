import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import firebase from '../../Firebase/Config';
import '../SnakeCharmers/charmer.css'
import { Web3Initialization } from '../MerkleDB/index'

function useScore() {
  const [score, setScore] = useState([]);

  useEffect(() => {
    firebase
      .firestore()
      .collection('ScoreBoard')
      .orderBy('score', 'desc')
      .onSnapshot((snapshot) => {
        const newScore = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setScore(newScore);
      })
  }, [])
  return score.slice(0, 7);;
}

function SnakeCharmers() {
  const score = useScore()
  return (
    <div>

      <h1 style={{ textAlign: 'center' }}>
        &#10027; Best Snake Trainers &#10027;
      </h1>
      <div >
        <Table className="table" variant="light" >
          <thead >
            <tr>
              <th style={{ background: 'white', borderRight: '1px solid black', borderBottom: '1px solid black' }}>Name</th>
              <th style={{ background: 'white', borderBottom: '1px solid black' }}>Size</th>
            </tr>
          </thead>
          <tbody>
            {score.map((item) =>
              <tr key={item.id}>
                <td style={{ background: 'white', borderRight: '1px solid black', borderBottom: '1px solid black' }}>{item.name}</td>
                <td style={{ background: 'white', borderBottom: '1px solid black' }}>{item.score}</td>
              </tr>
            )}
          </tbody>
        </Table>
        <Web3Initialization />
      </div>
    </div>
  );
}

export default SnakeCharmers;